import { EventEmitter } from "node:events";
import type { RadioState, RadioMode } from "../dtos.js";
import { EVENTS } from "../events.js";

export interface RadioServiceOptions {
  adapter: RigctlAdapter;
}

export interface RigctlAdapter {
  connect(host: string, port: number): Promise<void>;
  disconnect(): Promise<void>;
  getState(): Promise<Partial<RadioState>>;
  setFrequency(hz: number): Promise<void>;
  setMode(mode: RadioMode, bandwidthHz?: number): Promise<void>;
  setPower(percent: number): Promise<void>;
  setPtt(ptt: boolean): Promise<void>;
}

export class RadioService extends EventEmitter {
  private state: RadioState = { connected: false };
  constructor(private readonly opts: RadioServiceOptions) {
    super();
  }

  async connect(host: string, port: number) {
    await this.opts.adapter.connect(host, port);
    this.state.connected = true;
    this.emit(EVENTS.CONNECTION_STATUS, { connected: true });
    this.emit(EVENTS.RADIO_STATE, this.state);
  }

  async disconnect() {
    await this.opts.adapter.disconnect();
    this.state.connected = false;
    this.emit(EVENTS.CONNECTION_STATUS, { connected: false });
    this.emit(EVENTS.RADIO_STATE, this.state);
  }

  async refreshState() {
    const partial = await this.opts.adapter.getState();
    this.state = { ...this.state, ...partial };
    this.emit(EVENTS.RADIO_STATE, this.state);
  }

  getState(): RadioState {
    return this.state;
  }

  async setFrequency(hz: number) {
    await this.opts.adapter.setFrequency(hz);
    await this.refreshState();
  }

  async setMode(mode: RadioMode, bandwidthHz?: number) {
    await this.opts.adapter.setMode(mode, bandwidthHz);
    await this.refreshState();
  }

  async setPower(percent: number) {
    await this.opts.adapter.setPower(percent);
    await this.refreshState();
  }

  async setPtt(ptt: boolean) {
    await this.opts.adapter.setPtt(ptt);
    await this.refreshState();
  }
}

