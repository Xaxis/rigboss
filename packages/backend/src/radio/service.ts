import { EventEmitter } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { RigctldClient } from './client.js';
import { RadioCommands } from './commands.js';
import type { RadioState, RadioCapabilities } from './types.js';
import { EVENTS } from '../events.js';

export class RadioService extends EventEmitter {
  private client: RigctldClient;
  private commands: RadioCommands;
  private state: RadioState = { connected: false };
  private capabilities: RadioCapabilities | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private pollTick = 0;
  private activeTuning = false;
  private lastUserCommand = 0;
  private stateTimestamps: Record<string, number> = {};

  constructor(host: string, port: number) {
    super();
    this.client = new RigctldClient(host, port);
    this.commands = new RadioCommands(this.client);
  }

  async connect(host?: string, port?: number): Promise<void> {
    if (host && port) {
      this.client.setTarget(host, port);
    }

    await this.client.connect();

    // Probe connection with frequency check
    const frequency = await this.commands.getFrequency();
    if (frequency === undefined) {
      throw new Error('Radio probe failed - no frequency response');
    }

    this.state.connected = true;
    this.state.frequencyHz = frequency;
    this.emitState();
    this.emit(EVENTS.RADIO_CONNECTED, { connected: true });

    // Start polling and discover capabilities
    this.startPolling();
    await this.discoverCapabilities();
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.state.connected = false;
    this.emitState();
    this.emit(EVENTS.RADIO_DISCONNECTED, { connected: false });
  }

  getState(): RadioState {
    return { ...this.state };
  }

  getMetrics() {
    return {
      connected: this.state.connected,
      client: this.client.getMetrics(),
    };
  }

  async getCapabilities(): Promise<RadioCapabilities> {
    if (this.capabilities) return this.capabilities;
    await this.discoverCapabilities();
    return this.capabilities || this.getDefaultCapabilities();
  }

  // Core radio operations with optimistic updates
  async setFrequency(hz: number): Promise<void> {
    // Ensure frequency precision (round to nearest Hz)
    const preciseHz = Math.round(hz);
    await this.commands.setFrequency(preciseHz);
    this.state.frequencyHz = preciseHz;
    this.emitState();
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    await this.commands.setMode(mode, bandwidthHz);
    this.state.mode = mode;
    if (bandwidthHz) this.state.bandwidthHz = bandwidthHz;
    this.emitState();
  }

  async setPower(percent: number): Promise<void> {
    await this.commands.setPower(percent);
    this.state.power = percent;
    this.emitState();
  }

  async setPTT(on: boolean): Promise<void> {
    await this.commands.setPTT(on);
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
      this.capabilities = await this.commands.getCapabilities();
      this.emit(EVENTS.RADIO_CAPABILITIES, { capabilities: this.capabilities });
    } catch (error) {
      this.capabilities = this.getDefaultCapabilities();
      this.emit(EVENTS.RADIO_CAPABILITIES, { capabilities: this.capabilities });
      this.emit(EVENTS.RADIO_ERROR, { error: 'Failed to discover capabilities' });
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
        spectrum: false,
      },
    };
  }

  private startPolling(): void {
    if (this.pollTimer) return;

    // Start with simple, working polling - 500ms (2Hz)
    this.pollTimer = setInterval(async () => {
      try {
        await this.pollRadioState();
        this.pollTick++;
      } catch (error) {
        this.state.connected = false;
        this.emitState();
        this.emit(EVENTS.RADIO_ERROR, { error: 'Polling failed' });
      }
    }, 500);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.pollTick = 0;
    }
  }

  private async pollRadioState(): Promise<void> {
    // Core state every 500ms - critical for UI responsiveness
    const [frequency, modeInfo, ptt, vfo, splitInfo] = await Promise.all([
      this.commands.getFrequency(),
      this.commands.getMode(),
      this.commands.getPTT(),
      this.commands.getVFO(),
      this.commands.getSplit(),
    ]);

    // Update state directly - simple and working
    this.state.frequencyHz = frequency ?? this.state.frequencyHz;
    this.state.mode = modeInfo.mode ?? this.state.mode;
    this.state.bandwidthHz = modeInfo.bandwidthHz ?? this.state.bandwidthHz;
    if (typeof ptt === 'boolean') this.state.ptt = ptt;
    if (vfo) this.state.vfo = vfo;
    if (typeof splitInfo.split === 'boolean') this.state.split = splitInfo.split;

    // Extended state every 3 seconds
    if (this.pollTick % 6 === 0) {
      const [power, swr, signal, rit, xit] = await Promise.all([
        this.commands.getPower(),
        this.commands.getSWR(),
        this.commands.getSignalStrength(),
        this.commands.getRIT(),
        this.commands.getXIT(),
      ]);

      if (typeof power === 'number') this.state.power = power;
      if (typeof swr === 'number') this.state.swr = swr;
      if (typeof signal === 'number') this.state.signalStrength = signal;
      if (typeof rit === 'number') this.state.rit = rit;
      if (typeof xit === 'number') this.state.xit = xit;
    }

    this.state.connected = true;
    this.emitState();
  }

  private emitState(): void {
    this.emit(EVENTS.RADIO_STATE, {
      timestamp: Date.now(),
      state: this.getState(),
    });
  }
}
