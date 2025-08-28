import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

type PendingCmd = {
  cmd: string;
  resolve: (lines: string[]) => void;
  reject: (err: Error) => void;
  timeoutMs: number;
  fallbackOnNoRprt?: boolean;
  priority?: 'HIGH' | 'NORMAL';
};


// @TODO - WOuld this be better as a method of RigctldAdapter?
function parseResponse(lines: string[]): { result: string[]; code: number | null } {
  const rprtIdx = lines.findIndex((l) => l.startsWith('RPRT '));
  if (rprtIdx === -1) return { result: lines.slice(), code: null };
  const result = lines.slice(0, rprtIdx);
  const rprtLine = lines[rprtIdx]!;
  const code = Number(rprtLine.replace('RPRT ', '').trim());
  return { result, code: Number.isFinite(code) ? code : 0 };
}

class PersistentRigctldClient {
  private host: string;
  private port: number;
  private socket: net.Socket | null = null;
  private connected = false;
  private reconnecting = false;
  private buffer = '';
  private current: (PendingCmd & { lines: string[]; idleTimer?: NodeJS.Timeout; hardTimer?: NodeJS.Timeout; startedAt?: number }) | null = null;
  private queue: PendingCmd[] = [];
  private lastError: string | null = null;
  private lastRprtAt: number | null = null;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  getMetrics() {
    return {
      connected: this.connected,
      reconnecting: this.reconnecting,
      queueSize: this.queue.length + (this.current ? 1 : 0),
      inflightCmd: this.current?.cmd ?? null,
      inflightAgeMs: this.current?.startedAt ? Date.now() - this.current.startedAt : null,
      lastError: this.lastError,
      lastRprtAt: this.lastRprtAt,
      target: { host: this.host, port: this.port },
    };
  }

  getTarget() { return { host: this.host, port: this.port }; }
  isConnected() { return this.connected; }

  async connect(host?: string, port?: number): Promise<void> {
    if (host) this.host = host;
    if (port) this.port = port;
    if (this.socket) return; // already connected/connecting

    await new Promise<void>((resolve, reject) => {
      const s = new net.Socket();
      this.socket = s;
      s.setNoDelay(true);
      const onError = (err: Error) => {
        this.cleanupSocket();
        reject(err);
      };
      s.once('error', onError);
      s.connect(this.port, this.host, () => {
        s.off('error', onError);
        this.wireSocket(s);
        this.connected = true;
        resolve();
      });
    });
  }

  private wireSocket(s: net.Socket) {
    s.on('data', (buf) => this.onData(buf));
    s.on('error', (err) => this.onSocketError(err));
    s.on('close', () => this.onSocketClose());
    s.on('end', () => this.onSocketClose());
  }

  private onData(buf: Buffer) {
    this.buffer += buf.toString('utf8');
    let nlIdx: number;
    while ((nlIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, nlIdx).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nlIdx + 1);
      this.pushLine(line);
    }
  }

  private pushLine(line: string) {
    if (!this.current) return;
    const cur = this.current;
    cur.lines.push(line);
    if (line.startsWith('RPRT ')) {
      this.lastRprtAt = Date.now();
      this.finishCurrent();
      return;
    }
    if (cur.fallbackOnNoRprt) {
      if (cur.idleTimer) clearTimeout(cur.idleTimer);
      cur.idleTimer = setTimeout(() => {
        // resolve without RPRT on idle
        this.lastRprtAt = Date.now();
        this.finishCurrent(true);
      }, 200);
    }
  }

  private onSocketError(err: Error) {
    this.lastError = err.message;
    if (this.current) {
      this.current.reject(err);
      this.clearCurrentTimers();
      this.current = null;
    }
    while (this.queue.length) {
      this.queue.shift()!.reject(err);
    }
    this.reconnecting = true;
    // Kick off background reconnect
    void this.reconnect();
  }

  private onSocketClose() {
    this.connected = false;
    this.reconnecting = true;
    if (this.current) {
      this.current.reject(new Error('rigctld socket closed'));
      this.clearCurrentTimers();
      this.current = null;
    }
    while (this.queue.length) {
      this.queue.shift()!.reject(new Error('rigctld socket closed'));
    }
    this.cleanupSocket();
    // Kick off background reconnect
    void this.reconnect();
  }

  private cleanupSocket() {
    if (this.socket) {
      try { this.socket.destroy(); } catch {}
    }
    this.socket = null;
    this.connected = false;
    this.buffer = '';
  }

  private write(cmd: string) {
    if (!this.socket) throw new Error('rigctld socket not connected');
    this.socket.write(cmd + '\n');
  }

  private startNext() {
    if (this.current || this.queue.length === 0) return;
    const next = this.queue.shift()!;
    // Initialize new current
    this.current = { ...next, lines: [], startedAt: Date.now() } as any;
    const cur = this.current!;
    // hard timeout
    cur.hardTimer = setTimeout(() => {
      if (this.current !== cur) return;
      const err = new Error(`rigctld timeout for command: ${cur.cmd}`);
      cur.reject(err);
      this.current = null;
      this.startNext();
    }, cur.timeoutMs);
    this.write(cur.cmd);
  }

  private clearCurrentTimers() {
    if (!this.current) return;
    if (this.current.hardTimer) clearTimeout(this.current.hardTimer);
    if (this.current.idleTimer) clearTimeout(this.current.idleTimer);
  }

  private finishCurrent(fromIdle = false) {
    if (!this.current) return;
    const cur = this.current;
    this.clearCurrentTimers();
    this.current = null;
    const lines = cur.lines.slice();
    if (!fromIdle && !lines.find((l) => l.startsWith('RPRT ')) && !cur.fallbackOnNoRprt) {
      cur.reject(new Error('Malformed rigctld response (no RPRT)'));
    } else {
      cur.resolve(lines);
    }
    this.startNext();
  }

  async request(cmd: string, timeoutMs = 5000, opts?: { fallbackOnNoRprt?: boolean; priority?: 'HIGH' | 'NORMAL' }): Promise<string[]> {
    if (!this.socket) throw new Error('rigctld socket not connected');
    return new Promise<string[]>((resolve, reject) => {
      const pending: PendingCmd = { cmd, resolve, reject, timeoutMs, fallbackOnNoRprt: opts?.fallbackOnNoRprt, priority: opts?.priority ?? 'NORMAL' };
      if (pending.priority === 'HIGH') this.queue.unshift(pending);
      else this.queue.push(pending);
      this.startNext();
    });
  }
  async reconnect(backoffMs = 1000): Promise<void> {
    if (this.socket) return;
    let backoff = backoffMs;
    for (;;) {
      try {
        await this.connect();
        return;
      } catch {
        await delay(backoff);
        backoff = Math.min(backoff * 1.5, 15000);
      }
    }
  }


  async close(): Promise<void> {
    this.onSocketClose();
  }
}

export class RigctldAdapter {
  private host: string;
  private port: number;
  private connected = false;
  private client: PersistentRigctldClient;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
    this.client = new PersistentRigctldClient(host, port);
  }

  async connect(host?: string, port?: number): Promise<boolean> {
    if (host) this.host = host;
    if (port) this.port = port;
    try {
      await this.client.connect(this.host, this.port);
      // Probe with getter tolerant of missing RPRT
      const lines = await this.client.request('f', 4000, { fallbackOnNoRprt: true });
      const { code, result } = parseResponse(lines);
      const first = (result[0] ?? '').trim();
      const num = Number(first);
      if (code !== null && code !== 0 && !Number.isFinite(num)) {
        this.connected = false;
        throw new Error(`rigctld probe failed (RPRT ${code}, first='${first}') at ${this.host}:${this.port}`);
      }
      this.connected = true;
      return true;
    } catch (e: any) {
      this.connected = false;
      throw new Error(e?.message || `rigctld connect failed at ${this.host}:${this.port}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this.connected = false;
  }

  getTarget(): { host: string; port: number } {
    return { host: this.host, port: this.port };
  }

  isConnected(): boolean {
    return this.connected && this.client.isConnected();
  }

  async getFrequency(): Promise<number | undefined> {
    const lines = await this.client.request('f', 4000, { fallbackOnNoRprt: true });
    const { result, code } = parseResponse(lines);
    const first = (result[0] ?? '').trim();
    const hz = Number(first);
    if (Number.isFinite(hz)) return hz;
    if (code && code !== 0) return undefined;
    return undefined;
  }

  async setFrequency(hz: number): Promise<void> {
    const lines = await this.client.request(`F ${hz}`, 5000, { priority: 'HIGH' });
    const { code } = parseResponse(lines);
    if (code !== 0) throw new Error('Failed to set frequency');
  }

  async getMode(): Promise<{ mode?: string; bandwidthHz?: number }> {
    const lines = await this.client.request('m', 4000, { fallbackOnNoRprt: true });
    const { result, code } = parseResponse(lines);
    const mode = result[0]?.trim();
    const bw = Number(result[1]);
    const bandwidthHz = Number.isFinite(bw) ? bw : undefined;
    if (!mode && code && code !== 0) return {};
    return { mode, bandwidthHz };
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    const cmd = bandwidthHz ? `M ${mode} ${bandwidthHz}` : `M ${mode}`;
    const lines = await this.client.request(cmd, 5000, { priority: 'HIGH' });
    const { code } = parseResponse(lines);
    if (code !== 0) throw new Error('Failed to set mode');
  }

  async getPower(): Promise<number | undefined> {
    const lines = await this.client.request('l RFPOWER', 4000, { fallbackOnNoRprt: true });
    const { result, code } = parseResponse(lines);
    const v = Number(result[0]);
    if (!Number.isFinite(v)) return code && code !== 0 ? undefined : undefined;
    return Math.max(0, Math.min(100, Math.round(v * 100)));
  }

  async setPower(powerPercent: number): Promise<void> {
    const frac = Math.max(0, Math.min(1, powerPercent / 100));
    const lines = await this.client.request(`L RFPOWER ${frac}`, 5000, { priority: 'HIGH' });
    const { code } = parseResponse(lines);
    if (code !== 0) throw new Error('Failed to set power');
  }

  async getPTT(): Promise<boolean | undefined> {
    const lines = await this.client.request('t', 4000, { fallbackOnNoRprt: true });
    const { result, code } = parseResponse(lines);
    const v = result[0]?.trim();
    if (v === '1' || v === '0') return v === '1';
    if (code && code !== 0) return undefined;
    return undefined;
  }

  async setPTT(ptt: boolean): Promise<void> {
    const lines = await this.client.request(`T ${ptt ? 1 : 0}`, 5000, { priority: 'HIGH' });
    const { code } = parseResponse(lines);
    if (code !== 0) throw new Error('Failed to set PTT');
  }

  async getSWR(): Promise<number | undefined> {
    try {
      const lines = await this.client.request('l SWR', 4000, { fallbackOnNoRprt: true });
      const { result, code } = parseResponse(lines);
      const v = Number(result[0]);
      if (!Number.isFinite(v)) return code && code !== 0 ? undefined : undefined;
      return v;
    } catch {
      return undefined;
    }
  }

  async getSignalStrength(): Promise<number | undefined> {
    try {
      const lines = await this.client.request('l STRENGTH', 4000, { fallbackOnNoRprt: true });
      const { result, code } = parseResponse(lines);
      const v = Number(result[0]);
      if (!Number.isFinite(v)) return code && code !== 0 ? undefined : undefined;
      return -127 + v * (107);
    } catch {
      return undefined;
    }
  }

  async getCapabilities(): Promise<import('../dtos.js').RadioCapabilities> {
    try {
      const lines = await this.client.request('dump_caps', 8000, { fallbackOnNoRprt: true });
      const { result } = parseResponse(lines);
      const levels = new Set<string>();
      const funcs = new Set<string>();
      const modes = new Set<string>();
      const vfos = new Set<string>();
      for (const raw of result) {
        const line = raw.trim();

        if (/^Level:/i.test(line)) {
          line.replace(/^Level:\s*/i, '').split(/\s+/).forEach((t) => t && levels.add(t.trim()));
        } else if (/^Func:/i.test(line)) {
          line.replace(/^Func:\s*/i, '').split(/\s+/).forEach((t) => t && funcs.add(t.trim()));
        } else if (/^Mode:/i.test(line)) {
          line.replace(/^Mode:\s*/i, '').split(/\s+/).forEach((t) => t && modes.add(t.trim()));
        } else if (/^VFO:/i.test(line)) {
          line.replace(/^VFO:\s*/i, '').split(/\s+/).forEach((t) => t && vfos.add(t.trim()));
        }
      }
      const probeLevel = async (name: string): Promise<boolean> => {
        try {
          const lines = await this.client.request(`l ${name}`, 3000, { fallbackOnNoRprt: true });
          const { result } = parseResponse(lines);
          return result.length > 0;
        } catch { return false; }
      };


      // Verify a few levels/funcs by attempting safe reads (non-fatal)
      const toVerifyLevels = ['RFPOWER', 'STRENGTH', 'SWR'].filter((n) => levels.has(n));
      const toVerifyFuncs = ['PTT', 'SPLIT', 'RIT'].filter((n) => funcs.has(n));
      const verifiedLevels: Record<string, boolean> = {};
      const verifiedFuncs: Record<string, boolean> = {};
      await Promise.all(toVerifyLevels.map(async (name) => { verifiedLevels[name] = await probeLevel(name); }));
      // For funcs, we typically need setters; here we just mark presence as supported
      toVerifyFuncs.forEach((name) => { verifiedFuncs[name] = true; });

      const caps: import('../dtos.js').RadioCapabilities = {
        levels: Array.from(levels),
        funcs: Array.from(funcs),
        modes: Array.from(modes),
        vfos: Array.from(vfos),
        supports: {
          setFrequency: true,
          setMode: true,
          setPower: levels.has('RFPOWER'),
          setPTT: funcs.has('PTT'),
        },
        verifiedLevels,
        verifiedFuncs,
      };
      return caps;
    } catch {
      return {
        levels: [], funcs: [], modes: [], vfos: [],
        supports: { setFrequency: true, setMode: true, setPower: false, setPTT: true },
      };
    }
  }

  getMetrics() {
    return this.client ? this.client.getMetrics() : undefined;
  }

  async getRigModel(): Promise<string | undefined> {
    try {
      const lines = await this.client.request('v');
      const { result, code } = parseResponse(lines);
      if (code && code !== 0) return undefined;
      return result[0]?.trim();


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

