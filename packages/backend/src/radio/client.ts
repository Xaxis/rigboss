import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import type { ClientMetrics } from './types.js';

interface QueuedCommand {
  cmd: string;
  resolve: (lines: string[]) => void;
  reject: (error: Error) => void;
  timeoutMs: number;
  priority: 'HIGH' | 'NORMAL';
  fallback?: boolean;
}

interface ActiveCommand extends QueuedCommand {
  timeout: NodeJS.Timeout;
  idle?: NodeJS.Timeout;
  lines: string[];
  startedAt: number;
}

export class RigctldClient {
  private socket: net.Socket | null = null;
  private host: string;
  private port: number;
  private buffer = '';
  private current: ActiveCommand | null = null;
  private queue: QueuedCommand[] = [];
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
        this.lastError = null;

        socket.on('data', (buf) => this.onData(buf));
        socket.on('error', (err) => this.onSocketError(err));
        socket.on('close', () => this.onSocketClose());
        socket.on('end', () => this.onSocketClose());

        resolve();
      });
    });
  }

  async request(
    cmd: string,
    timeoutMs = 5000,
    options?: { fallback?: boolean; priority?: 'HIGH' | 'NORMAL' }
  ): Promise<string[]> {
    if (!this.socket) {
      throw new Error('Not connected to rigctld');
    }

    return new Promise<string[]>((resolve, reject) => {
      const command: QueuedCommand = {
        cmd,
        resolve,
        reject,
        timeoutMs,
        priority: options?.priority ?? 'NORMAL',
        fallback: options?.fallback,
      };

      // High priority commands go to front of queue
      if (command.priority === 'HIGH') {
        this.queue.unshift(command);
      } else {
        this.queue.push(command);
      }

      this.processNext();
    });
  }

  private onData(buf: Buffer): void {
    this.buffer += buf.toString('utf8');
    let newlineIndex: number;

    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newlineIndex + 1);
      this.processLine(line);
    }
  }

  private processLine(line: string): void {
    if (!this.current) return;

    this.current.lines.push(line);

    if (line.startsWith('RPRT ')) {
      this.lastRprtAt = Date.now();
      this.finishCommand(false);
      return;
    }

    // For fallback commands, use idle timeout
    if (this.current.fallback) {
      if (this.current.idle) clearTimeout(this.current.idle);
      this.current.idle = setTimeout(() => {
        this.lastRprtAt = Date.now();
        this.finishCommand(true);
      }, 200);
    }
  }

  private onSocketError(err: Error): void {
    this.lastError = err.message;
    this.connected = false;
    this.reconnecting = true;

    if (this.current) {
      this.current.reject(err);
      this.clearTimers();
      this.current = null;
    }

    // Reject all queued commands
    while (this.queue.length) {
      this.queue.shift()!.reject(err);
    }

    this.cleanup();
    void this.reconnect();
  }

  private onSocketClose(): void {
    this.connected = false;
    this.reconnecting = true;

    if (this.current) {
      this.current.reject(new Error('Socket closed'));
      this.clearTimers();
      this.current = null;
    }

    // Reject all queued commands
    while (this.queue.length) {
      this.queue.shift()!.reject(new Error('Socket closed'));
    }

    this.cleanup();
    void this.reconnect();
  }

  private cleanup(): void {
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.socket = null;
    this.buffer = '';
  }

  private clearTimers(): void {
    if (!this.current) return;
    clearTimeout(this.current.timeout);
    if (this.current.idle) clearTimeout(this.current.idle);
  }

  private finishCommand(fromIdle: boolean): void {
    if (!this.current) return;

    const command = this.current;
    this.clearTimers();
    this.current = null;

    const lines = command.lines.slice();

    // Validate response format
    if (!fromIdle && !lines.find(l => l.startsWith('RPRT ')) && !command.fallback) {
      command.reject(new Error('Malformed response (no RPRT)'));
    } else {
      command.resolve(lines);
    }

    this.processNext();
  }

  private write(cmd: string): void {
    if (!this.socket) {
      throw new Error('Not connected');
    }
    this.socket.write(cmd + '\n');
  }

  private processNext(): void {
    if (this.current || this.queue.length === 0) return;

    const next = this.queue.shift()!;
    this.current = {
      ...next,
      lines: [],
      startedAt: Date.now(),
      timeout: setTimeout(() => {
        if (this.current === this.current) {
          next.reject(new Error(`Rigctld timeout for: ${next.cmd}`));
          this.current = null;
          this.processNext();
        }
      }, next.timeoutMs),
    } as ActiveCommand;

    this.write(next.cmd);
  }

  private async reconnect(): Promise<void> {
    if (this.socket) return;

    let backoff = 1000;
    while (true) {
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
