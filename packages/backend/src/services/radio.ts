import { EventEmitter } from 'node:events';
import type { RadioState } from '../dtos.js';
import { RigctldAdapter } from '../adapters/rigctld.js';
import { EVENTS } from '../events.js';

export class RadioService extends EventEmitter {
  private state: RadioState = { connected: false, frequencyHz: 0, mode: '' };
  private adapter: RigctldAdapter;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(adapter: RigctldAdapter) {
    super();
    this.adapter = adapter;
  }

  getState(): RadioState {
    return { ...this.state };
  }

  private emitState() {
    const state = this.getState();
    this.emit(EVENTS.RADIO_STATE, state);
    this.emit(EVENTS.CONNECTION_STATUS, { connected: state.connected });
  }

  async connect(host?: string, port?: number): Promise<boolean> {
    const ok = await this.adapter.connect(host, port);
    this.state.connected = ok;
    this.emitState();
    if (ok) this.startPolling();
    return ok;
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    await this.adapter.disconnect();
    this.state.connected = false;
    this.emitState();
  }

  private startPolling() {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      try {
        const snapshot = await this.adapter.getState();
        this.state = { ...this.state, ...snapshot } as RadioState;
        this.emitState();
      } catch (e) {
        // Keep polling; mark disconnected and emit
        this.state.connected = false;
        this.emitState();
      }
    }, 1000);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async refreshState(): Promise<void> {
    const snapshot = await this.adapter.getState();
    this.state = { ...this.state, ...snapshot } as RadioState;
    this.emitState();
  }

  async setFrequency(hz: number): Promise<void> {
    await this.adapter.setFrequency(hz);
    await this.refreshState();
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    await this.adapter.setMode(mode, bandwidthHz);
    await this.refreshState();
  }

  async setPower(power: number): Promise<void> {
    await this.adapter.setPower(power);
    await this.refreshState();
  }

  async setPTT(ptt: boolean): Promise<void> {
    await this.adapter.setPTT(ptt);
    await this.refreshState();
  }

  async tune(ms = 1200): Promise<void> {
    await this.adapter.setPTT(true);
    await new Promise((r) => setTimeout(r, ms));
    await this.adapter.setPTT(false);
    await this.refreshState();
  }
}

