import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';

type PendingCommand = {
  cmd: string;
  resolve: (lines: string[]) => void;
  reject: (error: Error) => void;
  timeoutMs: number;
  fallback?: boolean;
  priority?: 'HIGH' | 'NORMAL';
};

type ActiveCommand = PendingCommand & {
  lines: string[];
  timeout: NodeJS.Timeout;
  idle?: NodeJS.Timeout;
  startedAt: number;
};

export type ClientMetrics = {
  connected: boolean;
  reconnecting: boolean;
  queueSize: number;
  inflightCmd: string | null;
  inflightAgeMs: number | null;
  lastError: string | null;
  lastRprtAt: number | null;
  target: { host: string; port: number };
};

export class RigctldClient {
  private socket: net.Socket | null = null;
  private host: string;
  private port: number;
  private buffer = '';
  private current: ActiveCommand | null = null;
  private queue: PendingCommand[] = [];
  private connected = false;
  private reconnecting = false;
  private lastError: string | null = null;
  private lastRprtAt: number | null = null;

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }

  setTarget(host: string, port: number): void {
    this.host = host;
    this.port = port;
  }

  getMetrics(): ClientMetrics {
    return {
      connected: this.connected,
      reconnecting: this.reconnecting,
      queueSize: this.queue.length + (this.current ? 1 : 0),
      inflightCmd: this.current?.cmd ?? null,
      inflightAgeMs: this.current ? Date.now() - this.current.startedAt : null,
      lastError: this.lastError,
      lastRprtAt: this.lastRprtAt,
      target: { host: this.host, port: this.port },
    };
  }

  async connect(): Promise<void> {
    if (this.socket) return;

    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      this.socket = socket;
      socket.setNoDelay(true);

      const onError = (err: Error) => {
        this.cleanup();
        this.lastError = err.message;
        reject(err);
      };

      socket.once('error', onError);
      socket.connect(this.port, this.host, () => {
        socket.off('error', onError);
        this.connected = true;
        this.reconnecting = false;
        this.wireSocket(socket);
        resolve();
      });
    });
  }

  async request(
    cmd: string,
    timeoutMs = 5000,
    opts?: { fallback?: boolean; priority?: 'HIGH' | 'NORMAL' }
  ): Promise<string[]> {
    if (!this.socket) throw new Error('not connected');

    return new Promise<string[]>((resolve, reject) => {
      const pending: PendingCommand = {
        cmd,
        resolve,
        reject,
        timeoutMs,
        fallback: opts?.fallback,
        priority: opts?.priority ?? 'NORMAL',
      };

      if (pending.priority === 'HIGH') {
        this.queue.unshift(pending);
      } else {
        this.queue.push(pending);
      }

      this.startNext();
    });
  }

  private wireSocket(socket: net.Socket): void {
    socket.on('data', (buf) => this.onData(buf));
    socket.on('error', (err) => this.onSocketError(err));
    socket.on('close', () => this.onSocketClose());
    socket.on('end', () => this.onSocketClose());
  }

  private onData(buf: Buffer): void {
    this.buffer += buf.toString('utf8');
    let nlIndex: number;
    while ((nlIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, nlIndex).replace(/\r$/, '');
      this.buffer = this.buffer.slice(nlIndex + 1);
      this.pushLine(line);
    }
  }

  private pushLine(line: string): void {
    if (!this.current) return;

    const current = this.current;
    current.lines.push(line);

    if (line.startsWith('RPRT ')) {
      this.lastRprtAt = Date.now();
      this.finishCurrent(false);
      return;
    }

    if (current.fallback) {
      if (current.idle) clearTimeout(current.idle);
      current.idle = setTimeout(() => {
        this.lastRprtAt = Date.now();
        this.finishCurrent(true);
      }, 200);
    }
  }

  private onSocketError(err: Error): void {
    this.lastError = err.message;
    this.rejectAll(err);
    this.reconnecting = true;
    void this.reconnect();
  }

  private onSocketClose(): void {
    this.connected = false;
    this.reconnecting = true;
    this.rejectAll(new Error('socket closed'));
    this.cleanup();
    void this.reconnect();
  }

  private rejectAll(error: Error): void {
    if (this.current) {
      this.current.reject(error);
      this.clearCurrentTimers();
      this.current = null;
    }
    while (this.queue.length) {
      this.queue.shift()!.reject(error);
    }
  }

  private cleanup(): void {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
    }
    this.socket = null;
    this.buffer = '';
  }

  private clearCurrentTimers(): void {
    if (!this.current) return;
    clearTimeout(this.current.timeout);
    if (this.current.idle) clearTimeout(this.current.idle);
  }

  private finishCurrent(fromIdle: boolean): void {
    if (!this.current) return;

    const current = this.current;
    this.clearCurrentTimers();
    this.current = null;

    const lines = current.lines.slice();
    const hasRprt = lines.some(l => l.startsWith('RPRT '));

    if (!fromIdle && !hasRprt && !current.fallback) {
      current.reject(new Error('Malformed response (no RPRT)'));
    } else {
      current.resolve(lines);
    }

    this.startNext();
  }

  private write(cmd: string): void {
    if (!this.socket) throw new Error('not connected');
    this.socket.write(cmd + '\n');
  }

  private startNext(): void {
    if (this.current || this.queue.length === 0) return;

    const next = this.queue.shift()!;
    this.current = {
      ...next,
      lines: [],
      startedAt: Date.now(),
      timeout: setTimeout(() => {
        if (this.current === this.current) {
          next.reject(new Error(`rigctld timeout for: ${next.cmd}`));
          this.current = null;
          this.startNext();
        }
      }, next.timeoutMs),
    };

    this.write(next.cmd);
  }

  private async reconnect(): Promise<void> {
    if (this.socket) return;

    let backoff = 1000;
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
}
