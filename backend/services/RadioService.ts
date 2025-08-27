import { BaseService } from './BaseService.js';
import { RigctlService } from './RigctlService.js';
import type { 
  IRadioService, 
  RadioState, 
  ServiceHealth, 
  ServiceCapabilities 
} from '../types/services.js';

export class RadioService extends BaseService implements IRadioService {
  private rigctlService: RigctlService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentState: RadioState | null = null;
  private config: any;

  constructor(config: any) {
    super('radio', '1.0.0', 'Radio control and state management');
    this.config = config;
    this.rigctlService = new RigctlService({
      host: config.rigctldHost || 'localhost',
      port: config.rigctldPort || 4532,
      reconnectInterval: 5000,
      commandTimeout: config.commandTimeout || 3000
    });
  }

  protected async onStart(): Promise<void> {
    // Radio service starts but doesn't auto-connect to rigctld
    // Connection happens via explicit connect() call
  }

  protected async onStop(): Promise<void> {
    this.stopPolling();
    await this.disconnect();
  }

  protected onGetHealth(): Partial<ServiceHealth> {
    return {
      status: this.rigctlService.isConnected() ? 'healthy' : 'degraded',
      details: {
        rigctldConnected: this.rigctlService.isConnected(),
        polling: !!this.pollingInterval,
        lastState: this.currentState ? 'available' : 'none',
      },
    };
  }

  protected onGetCapabilities(): ServiceCapabilities {
    return {
      features: ['frequency_control', 'mode_control', 'power_control', 'ptt_control', 'state_polling'],
      version: this.version,
      endpoints: {
        http: ['/api/radio/connect', '/api/radio/disconnect', '/api/radio/state', '/api/radio/frequency', '/api/radio/mode', '/api/radio/power', '/api/radio/ptt'],
        socket: ['/radio'],
      },
      dependencies: ['rigctld'],
    };
  }

  // IRadioService implementation
  async connect(host: string, port: number): Promise<void> {
    try {
      // Update rigctl service config
      this.rigctlService = new RigctlService({
        host,
        port,
        reconnectInterval: 5000,
        commandTimeout: this.config.commandTimeout || 3000
      });

      await this.rigctlService.connect();
      this.emitEvent('connected', { host, port });

      // Get initial state
      const state = await this.getState();
      this.emitEvent('state_changed', state);
    } catch (error) {
      this.emitEvent('connection_failed', { host, port, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.rigctlService.disconnect();
    this.currentState = null;
    this.emitEvent('disconnected', {});
  }

  isConnected(): boolean {
    return this.rigctlService.isConnected();
  }

  async getState(): Promise<RadioState> {
    if (!this.isConnected()) {
      throw new Error('Radio not connected');
    }

    try {
      const [frequency, modeInfo, power, ptt, radioInfo] = await Promise.all([
        this.rigctlService.getFrequency(),
        this.rigctlService.getMode(),
        this.rigctlService.getPowerLevel(),
        this.rigctlService.getPTT(),
        this.rigctlService.getRadioInfo(),
      ]);

      const state: RadioState = {
        frequency,
        mode: modeInfo.mode,
        bandwidth: modeInfo.bandwidth,
        power,
        ptt,
        connected: true,
        model: radioInfo.model,
        squelch: 0, // TODO: Implement if supported
        volume: 0,  // TODO: Implement if supported
        antenna: 1, // TODO: Implement if supported
      };

      this.currentState = state;
      return state;
    } catch (error) {
      throw new Error(`Failed to get radio state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setFrequency(frequency: number): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Radio not connected');
    }

    await this.rigctlService.setFrequency(frequency);
    this.emitEvent('frequency_changed', { frequency });
    
    // Update cached state
    if (this.currentState) {
      this.currentState.frequency = frequency;
    }
  }

  async setMode(mode: string, bandwidth?: number): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Radio not connected');
    }

    // Convert string to RadioMode type (assuming it's a valid mode)
    await this.rigctlService.setMode(mode as any, bandwidth);
    this.emitEvent('mode_changed', { mode, bandwidth });

    // Update cached state
    if (this.currentState) {
      this.currentState.mode = mode;
      if (bandwidth !== undefined) {
        this.currentState.bandwidth = bandwidth;
      }
    }
  }

  async setPower(power: number): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Radio not connected');
    }

    await this.rigctlService.setPowerLevel(power);
    this.emitEvent('power_changed', { power });
    
    // Update cached state
    if (this.currentState) {
      this.currentState.power = power;
    }
  }

  async setPTT(enabled: boolean): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Radio not connected');
    }

    await this.rigctlService.setPTT(enabled);
    this.emitEvent('ptt_changed', { enabled });
    
    // Update cached state
    if (this.currentState) {
      this.currentState.ptt = enabled;
    }
  }

  startPolling(interval: number = this.config.pollInterval): void {
    if (this.pollingInterval) {
      return; // Already polling
    }

    this.pollingInterval = setInterval(async () => {
      try {
        if (this.isConnected()) {
          const state = await this.getState();
          this.emitEvent('state_changed', state);
        }
      } catch (error) {
        console.error('Polling error:', error);
        this.emitEvent('polling_error', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }, interval);

    this.emitEvent('polling_started', { interval });
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.emitEvent('polling_stopped', {});
    }
  }

  // Additional methods for service management
  getCurrentState(): RadioState | null {
    return this.currentState;
  }

  isPolling(): boolean {
    return !!this.pollingInterval;
  }
}
