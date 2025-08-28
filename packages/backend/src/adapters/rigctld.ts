import { Socket } from 'net';
import { RigctlAdapter, RadioState } from '../types/radio';

export class RigctldAdapter implements RigctlAdapter {
  private socket: Socket | null = null;
  private connected = false;
  private host = 'localhost';
  private port = 4532;

  async connect(host: string, port: number): Promise<void> {
    this.host = host || 'localhost';
    this.port = port || 4532;

    return new Promise((resolve, reject) => {
      this.socket = new Socket();
      
      this.socket.connect(this.port, this.host, () => {
        console.log(`✅ Connected to rigctld at ${this.host}:${this.port}`);
        this.connected = true;
        resolve();
      });

      this.socket.on('error', (error) => {
        console.error(`❌ Rigctld connection error:`, error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('📡 Rigctld connection closed');
        this.connected = false;
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }

  private async sendCommand(command: string): Promise<string> {
    // Use a fresh connection per command to avoid interleaving responses.
    return new Promise((resolve, reject) => {
      const sock = new Socket();
      let buf = '';
      let finished = false;
      const timeout = setTimeout(() => {
        if (!finished) {
          finished = true;
          try { sock.destroy(); } catch {}
          reject(new Error(`Command timeout: ${command}`));
        }
      }, 5000);

      const cleanup = () => {
        clearTimeout(timeout);
        sock.removeAllListeners();
        try { sock.end(); } catch {}
        try { sock.destroy(); } catch {}
      };

      sock.on('error', (err) => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(err);
      });

      sock.on('data', (data: Buffer) => {
        if (finished) return;
        buf += data.toString();
        // rigctld terminates responses with a line starting with RPRT
        const lines = buf.split(/\r?\n/);
        const rprtIdx = lines.findIndex(l => /^RPRT\s/.test(l));
        if (rprtIdx !== -1) {
          const payloadLines = lines.slice(0, rprtIdx).filter(l => l.length > 0);
          finished = true;
          cleanup();
          resolve(payloadLines.join('\n'));
        }
      });

      sock.connect(this.port, this.host, () => {
        sock.write(command + '\n');
      });
    });
  }

  async getFrequency(): Promise<number> {
    const response = await this.sendCommand('f');
    const freq = parseInt(response.trim());
    return freq;
  }

  async setFrequency(frequency: number): Promise<void> {
    await this.sendCommand(`F ${frequency}`);
  }

  async getMode(): Promise<{ mode: string; bandwidth: number }> {
    const response = await this.sendCommand('m');
    const lines = response.trim().split('\n');
    const mode = lines[0] || 'USB';
    const bandwidth = lines.length > 1 ? parseInt(lines[1]) : 2400;
    return { mode, bandwidth };
  }

  async setMode(mode: string, bandwidth?: number): Promise<void> {
    const bw = bandwidth || 2400;
    await this.sendCommand(`M ${mode} ${bw}`);
  }

  async getPower(): Promise<number> {
    const response = await this.sendCommand('l RFPOWER');
    const power = parseFloat(response.trim()) * 100; // Convert 0.0-1.0 to 0-100
    return Math.round(Math.max(0, Math.min(100, power))); // Clamp to 0-100
  }

  async setPower(power: number): Promise<void> {
    const powerLevel = power / 100; // Convert 0-100 to 0.0-1.0
    await this.sendCommand(`L RFPOWER ${powerLevel}`);
  }

  async getPTT(): Promise<boolean> {
    const res = await this.sendCommand('t');
    return res.trim() === '1';
  }

  async setPtt(ptt: boolean): Promise<void> {
    await this.sendCommand(`T ${ptt ? 1 : 0}`);
  }

  async getSignalStrength(): Promise<number | undefined> {
    // Try candidates for S-meter; values may be 0.0..1.0
    for (const token of ['STRENGTH', 'SMETER']) {
      try {
        const res = await this.sendCommand(`l ${token}`);
        const v = parseFloat(res.trim());
        if (isFinite(v)) {
          // Map 0..1 -> -120..-40 dBm
          return Math.round(-120 + v * 80);
        }
      } catch {}
    }
    return undefined;
  }

  async getSWR(): Promise<number | undefined> {
    try {
      const res = await this.sendCommand('l SWR');
      const v = parseFloat(res.trim());
      if (isFinite(v) && v > 0) return parseFloat(v.toFixed(2));
    } catch {}
    return undefined;
  }

  async getState(): Promise<Partial<RadioState>> {
    try {
      const [frequency, modeInfo, power, ptt, swr, signal] = await Promise.all([
        this.getFrequency(),
        this.getMode(),
        this.getPower(),
        this.getPTT().catch(() => false),
        this.getSWR().catch(() => undefined),
        this.getSignalStrength().catch(() => undefined),
      ]);

      const state: Partial<RadioState> = {
        connected: this.connected,
        frequencyHz: frequency,
        mode: modeInfo.mode as any,
        bandwidthHz: modeInfo.bandwidth,
        power,
        ptt,
        rigModel: 'IC-7300',
      };
      if (typeof swr === 'number') (state as any).swr = swr;
      if (typeof signal === 'number') (state as any).signalStrength = signal;
      return state;
    } catch (error) {
      return { connected: false };
    }
  }
}
