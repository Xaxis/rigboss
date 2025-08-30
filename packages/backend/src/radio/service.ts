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

  // Core radio operations with user intent tracking
  async setFrequency(hz: number): Promise<void> {
    this.markUserCommand('frequencyHz');
    await this.commands.setFrequency(hz);
    this.updateStateWithSource('frequencyHz', hz, 'user');
    this.emitState();
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    this.markUserCommand('mode');
    await this.commands.setMode(mode, bandwidthHz);
    this.updateStateWithSource('mode', mode, 'user');
    if (bandwidthHz) this.updateStateWithSource('bandwidthHz', bandwidthHz, 'user');
    this.emitState();
  }

  async setPower(percent: number): Promise<void> {
    this.markUserCommand('power');
    await this.commands.setPower(percent);
    this.updateStateWithSource('power', percent, 'user');
    this.emitState();
  }

  async setPTT(on: boolean): Promise<void> {
    this.markUserCommand('ptt');
    await this.commands.setPTT(on);
    this.updateStateWithSource('ptt', on, 'user');
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

    // Adaptive polling: faster when user is actively tuning
    const pollInterval = this.isActiveTuning() ? 200 : 500; // 5Hz vs 2Hz

    this.pollTimer = setInterval(async () => {
      try {
        await this.pollCriticalState();
        this.pollTick++;

        // Extended state every 4th tick (800ms-2s depending on mode)
        if (this.pollTick % 4 === 0) {
          await this.pollExtendedState();
        }

        // Update active tuning status
        this.updateActiveTuningStatus();
      } catch (error) {
        this.state.connected = false;
        this.emitState();
        this.emit(EVENTS.RADIO_ERROR, { error: 'Polling failed' });
      }
    }, pollInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.pollTick = 0;
    }
  }

  private async pollCriticalState(): Promise<void> {
    // Critical state for real-time tracking
    const [frequency, modeInfo, ptt, vfo, splitInfo] = await Promise.all([
      this.commands.getFrequency(),
      this.commands.getMode(),
      this.commands.getPTT(),
      this.commands.getVFO(),
      this.commands.getSplit(),
    ]);

    // Update state with conflict resolution
    this.updateStateWithSource('frequencyHz', frequency, 'radio');
    this.updateStateWithSource('mode', modeInfo.mode, 'radio');
    this.updateStateWithSource('bandwidthHz', modeInfo.bandwidthHz, 'radio');
    this.updateStateWithSource('ptt', ptt, 'radio');
    this.updateStateWithSource('vfo', vfo, 'radio');
    this.updateStateWithSource('split', splitInfo.split, 'radio');

    this.state.connected = true;
    this.emitState();
  }

  private async pollExtendedState(): Promise<void> {
    // Extended state - less critical for real-time
    const [power, swr, signal, rit, xit] = await Promise.all([
      this.commands.getPower(),
      this.commands.getSWR(),
      this.commands.getSignalStrength(),
      this.commands.getRIT(),
      this.commands.getXIT(),
    ]);

    this.updateStateWithSource('power', power, 'radio');
    this.updateStateWithSource('swr', swr, 'radio');
    this.updateStateWithSource('signalStrength', signal, 'radio');
    this.updateStateWithSource('rit', rit, 'radio');
    this.updateStateWithSource('xit', xit, 'radio');
  }

  private markUserCommand(field: string): void {
    this.lastUserCommand = Date.now();
    this.stateTimestamps[field] = Date.now();
    this.activeTuning = true;
  }

  private updateStateWithSource(field: string, value: any, source: 'user' | 'radio'): void {
    if (value === undefined || value === null) return;

    const now = Date.now();
    const lastUserTime = this.stateTimestamps[field] || 0;
    const userRecentlyChanged = (now - lastUserTime) < 2000; // 2 second user priority

    // User intent takes priority for recent changes
    if (source === 'radio' && userRecentlyChanged) {
      return; // Ignore radio updates for recently user-changed fields
    }

    // Update state and timestamp
    (this.state as any)[field] = value;
    if (source === 'user') {
      this.stateTimestamps[field] = now;
    }
  }

  private isActiveTuning(): boolean {
    const now = Date.now();
    return this.activeTuning && (now - this.lastUserCommand) < 3000; // 3 second window
  }

  private updateActiveTuningStatus(): void {
    const now = Date.now();
    if (this.activeTuning && (now - this.lastUserCommand) > 3000) {
      this.activeTuning = false;
      // Restart polling with new interval
      this.stopPolling();
      this.startPolling();
    }
  }

  private emitState(): void {
    this.emit(EVENTS.RADIO_STATE, {
      timestamp: Date.now(),
      state: this.getState(),
    });
  }
}
