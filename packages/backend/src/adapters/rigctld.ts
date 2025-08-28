import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

function parseRPRT(lines: string[]): { ok: boolean; code: number } {
  const last = lines.find((l) => l.startsWith('RPRT ')) || '';
  const code = Number(last.replace('RPRT ', '').trim());
  return { ok: code === 0, code };
}

async function sendCommand(host: string, port: number, cmd: string, timeoutMs = 5000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const chunks: string[] = [];
    let resolved = false;

    const cleanup = (err?: Error) => {
      if (!resolved) {
        resolved = true;
        if (err) reject(err);
      }
      socket.destroy();
    };

    const timer = setTimeout(() => cleanup(new Error(`rigctld timeout for command: ${cmd}`)), timeoutMs);

    socket.setNoDelay(true);
    socket.connect(port, host, () => {
      socket.write(cmd + '\n');
    });

    socket.on('data', (buf) => {
      const text = buf.toString('utf8');
      chunks.push(text);
      if (text.includes('RPRT ')) {
        clearTimeout(timer);
        cleanup();
        const all = chunks.join('');
        const lines = all.split(/\r?\n/).filter((l) => l.length > 0);
        resolve(lines);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      cleanup(err);
    });

    socket.on('close', () => {
      // ignore
    });
  });
}

export class RigctldAdapter {
  private host: string;
  private port: number;
  private connected = false;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  async connect(host?: string, port?: number): Promise<boolean> {
    if (host) this.host = host;
    if (port) this.port = port;
    try {
      // Probe with a simple read command
      const lines = await sendCommand(this.host, this.port, 'f');
      const { ok } = parseRPRT(lines);
      this.connected = ok;
      return ok;
    } catch (e) {
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async getFrequency(): Promise<number | undefined> {
    const lines = await sendCommand(this.host, this.port, 'f');
    const { ok } = parseRPRT(lines);
    if (!ok) return undefined;
    const freqLine = lines[0] ?? '';
    const hz = Number(freqLine.trim());
    return Number.isFinite(hz) ? hz : undefined;
  }

  async setFrequency(hz: number): Promise<void> {
    const lines = await sendCommand(this.host, this.port, `F ${hz}`);
    const { ok } = parseRPRT(lines);
    if (!ok) throw new Error('Failed to set frequency');
  }

  async getMode(): Promise<{ mode?: string; bandwidthHz?: number }> {
    const lines = await sendCommand(this.host, this.port, 'm');
    const { ok } = parseRPRT(lines);
    if (!ok) return {};
    const mode = lines[0]?.trim();
    const bw = Number(lines[1]);
    const bandwidthHz = Number.isFinite(bw) ? bw : undefined;
    return { mode, bandwidthHz };
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    const cmd = bandwidthHz ? `M ${mode} ${bandwidthHz}` : `M ${mode}`;
    const lines = await sendCommand(this.host, this.port, cmd);
    const { ok } = parseRPRT(lines);
    if (!ok) throw new Error('Failed to set mode');
  }

  async getPower(): Promise<number | undefined> {
    const lines = await sendCommand(this.host, this.port, 'l RFPOWER');
    const { ok } = parseRPRT(lines);
    if (!ok) return undefined;
    const v = Number(lines[0]);
    if (!Number.isFinite(v)) return undefined;
    const pct = Math.max(0, Math.min(100, Math.round(v * 100)));
    return pct;
  }

  async setPower(powerPercent: number): Promise<void> {
    const frac = Math.max(0, Math.min(1, powerPercent / 100));
    const lines = await sendCommand(this.host, this.port, `L RFPOWER ${frac}`);
    const { ok } = parseRPRT(lines);
    if (!ok) throw new Error('Failed to set power');
  }

  async getPTT(): Promise<boolean | undefined> {
    const lines = await sendCommand(this.host, this.port, 't');
    const { ok } = parseRPRT(lines);
    if (!ok) return undefined;
    const v = lines[0]?.trim();
    return v === '1';
  }

  async setPTT(ptt: boolean): Promise<void> {
    const lines = await sendCommand(this.host, this.port, `T ${ptt ? 1 : 0}`);
    const { ok } = parseRPRT(lines);
    if (!ok) throw new Error('Failed to set PTT');
  }

  async getSWR(): Promise<number | undefined> {
    try {
      const lines = await sendCommand(this.host, this.port, 'l SWR');
      const { ok } = parseRPRT(lines);
      if (!ok) return undefined;
      const v = Number(lines[0]);
      return Number.isFinite(v) ? v : undefined;
    } catch {
      return undefined;
    }
  }

  async getSignalStrength(): Promise<number | undefined> {
    try {
      const lines = await sendCommand(this.host, this.port, 'l STRENGTH');
      const { ok } = parseRPRT(lines);
      if (!ok) return undefined;
      const v = Number(lines[0]);
      if (!Number.isFinite(v)) return undefined;
      // Map 0..1 to approx -127..-20 dBm (rough heuristic)
      return -127 + v * (107);
    } catch {
      return undefined;
    }
  }

  async getRigModel(): Promise<string | undefined> {
    try {
      const lines = await sendCommand(this.host, this.port, 'v');
      const { ok } = parseRPRT(lines);
      if (!ok) return undefined;
      return lines[0]?.trim();
    } catch {
      return undefined;
    }
  }

  async getState(): Promise<{
    connected: boolean;
    frequencyHz?: number;
    mode?: string;
    bandwidthHz?: number;
    power?: number;
    ptt?: boolean;
    rigModel?: string;
    swr?: number;
    signalStrength?: number;
  }> {
    if (!this.connected) {
      return { connected: false };
    }
    try {
      const [frequencyHz, { mode, bandwidthHz }, power, ptt, rigModel, swr, signalStrength] = await Promise.all([
        this.getFrequency(),
        this.getMode(),
        this.getPower(),
        this.getPTT(),
        this.getRigModel(),
        this.getSWR(),
        this.getSignalStrength(),
      ]);
      return {
        connected: true,
        frequencyHz,
        mode,
        bandwidthHz,
        power,
        ptt,
        rigModel,
        swr,
        signalStrength,
      };
    } catch (e) {
      return { connected: false };
    }
  }
}

