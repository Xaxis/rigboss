import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { EVENTS } from '../index.js';
import type { RadioState, RadioCapabilities } from '../types/radio.js';
import { RigctldClient } from '../lib/rigctld-client.js';
import { RigctlAdapter } from '../adapters/rigctl-adapter.js';
import { RadioPoller } from './radio-poller.js';

export class RadioService extends EventEmitter {
  private client: RigctldClient;
  private adapter: RigctlAdapter;
  private poller: RadioPoller;
  private state: RadioState = { connected: false };
  private capabilities: RadioCapabilities | null = null;

  constructor(host: string, port: number) {
    super();
    this.client = new RigctldClient(host, port);
    this.adapter = new RigctlAdapter(this.client);
    this.poller = new RadioPoller(
      this.adapter,
      (update) => this.updateState(update),
      (error) => this.handlePollingError(error)
    );
  }

  async connect(host?: string, port?: number): Promise<void> {
    if (host && port) this.client.setTarget(host, port);
    
    await this.client.connect();
    
    // Probe to verify connection
    const frequency = await this.adapter.getFrequency();
    if (frequency === undefined) {
      throw new Error('probe failed');
    }
    
    this.state.connected = true;
    this.emitState();
    this.poller.start();
    await this.discoverCapabilities();
  }

  async disconnect(): Promise<void> {
    this.poller.stop();
    this.state.connected = false;
    this.emitState();
  }

  getState(): RadioState {
    return { ...this.state };
  }

  getMetrics() {
    return {
      connected: this.state.connected,
      adapter: this.client.getMetrics(),
    };
  }

  async getCapabilities(): Promise<RadioCapabilities> {
    if (this.capabilities) return this.capabilities;
    await this.discoverCapabilities();
    return this.capabilities || this.getDefaultCapabilities();
  }

  // High-priority setters with optimistic updates
  async setFrequency(hz: number): Promise<void> {
    await this.adapter.setFrequency(hz);
    this.state.frequencyHz = hz;
    this.emitState();
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    await this.adapter.setMode(mode, bandwidthHz);
    this.state.mode = mode;
    if (bandwidthHz) this.state.bandwidthHz = bandwidthHz;
    this.emitState();
  }

  async setPower(percent: number): Promise<void> {
    await this.adapter.setPower(percent);
    this.state.power = percent;
    this.emitState();
  }

  async setPTT(on: boolean): Promise<void> {
    await this.adapter.setPTT(on);
    this.state.ptt = on;
    this.emitState();
  }

  async tune(ms = 1200): Promise<void> {
    this.state.tuning = true;
    this.emitState();
    try {
      await this.setPTT(true);
      await delay(ms);
    } finally {
      await this.setPTT(false);
      this.state.tuning = false;
      this.emitState();
    }
  }

  private async discoverCapabilities(): Promise<void> {
    try {
      this.capabilities = await this.adapter.getCapabilities();
      this.emit(EVENTS.RADIO_CAPS, this.capabilities);
    } catch {
      this.capabilities = this.getDefaultCapabilities();
      this.emit(EVENTS.RADIO_CAPS, this.capabilities);
    }
  }

  private getDefaultCapabilities(): RadioCapabilities {
    return {
      levels: [],
      funcs: [],
      modes: [],
      vfos: [],
      supports: {
        setFrequency: true,
        setMode: true,
        setPower: false,
        setPTT: true,
        setVFO: false,
        setRIT: false,
        setXIT: false,
        setSplit: false,
        setAntenna: false,
        setCTCSS: false,
        setDCS: false,
        setTuningStep: false,
        setRepeater: false,
        setAGC: false,
        setNoiseBlanker: false,
        setNoiseReduction: false,
        setAttenuator: false,
        setPreamp: false,
        setSquelch: false,
        setRFGain: false,
        setAFGain: false,
        setMicGain: false,
        setKeySpeed: false,
        setVOX: false,
        setCompressor: false,
        setMonitor: false,
        setBreakIn: false,
        sendMorse: false,
        tune: false,
        scan: false,
        memoryOps: false,
      },
    };
  }

  private updateState(update: Partial<RadioState>): void {
    Object.assign(this.state, update);
    this.state.connected = true;
    this.emitState();
  }

  private handlePollingError(error: Error): void {
    this.state.connected = false;
    this.emitState();
  }

  private emitState(): void {
    this.emit(EVENTS.RADIO_STATE, this.getState());
    this.emit(EVENTS.CONNECTION_STATUS, { connected: this.state.connected });
  }
}
