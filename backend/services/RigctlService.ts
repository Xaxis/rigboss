import { Socket } from 'net';
import { EventEmitter } from 'events';
import type { RadioState, RigctlCommand, RigctlResponse, RadioMode } from '@/types/radio';

export interface RigctlConfig {
  host: string;
  port: number;
  reconnectInterval: number;
  commandTimeout: number;
}

export class RigctlService extends EventEmitter {
  private socket: Socket | null = null;
  private config: RigctlConfig;
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private commandQueue: Array<{
    command: string;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  private currentRadioState: Partial<RadioState> = {};

  constructor(config: RigctlConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.socket = new Socket();

      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.socket) {
          this.socket.destroy();
        }
        reject(new Error(`Connection timeout to ${this.config.host}:${this.config.port}`));
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log(`Connected to rigctld at ${this.config.host}:${this.config.port}`);
        this.connected = true;
        this.emit('connected');

        // Clear any reconnect timer
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleResponse(data.toString());
      });

      this.socket.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('rigctld connection error:', error);
        this.connected = false;
        this.emit('error', error);
        reject(error);
      });

      this.socket.on('close', () => {
        clearTimeout(connectionTimeout);
        console.log('rigctld connection closed');
        this.connected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.socket.connect(this.config.port, this.config.host);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    
    this.connected = false;
    this.emit('disconnected');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect to rigctld...');
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.config.reconnectInterval);
  }

  private handleResponse(data: string): void {
    if (!data || typeof data !== 'string') {
      console.warn('Invalid response data from rigctld:', data);
      return;
    }

    const lines = data.trim().split('\n');

    for (const line of lines) {
      if (line.trim() && this.commandQueue.length > 0) {
        const command = this.commandQueue.shift()!;
        clearTimeout(command.timeout);

        // Parse response based on command type
        try {
          const result = this.parseResponse(line);
          command.resolve(result);
        } catch (error) {
          console.warn('Response parse error:', error, 'for line:', line);
          command.reject(error as Error);
        }
      }
    }
  }

  private parseResponse(response: string): any {
    if (!response || typeof response !== 'string') {
      throw new Error('Invalid response: not a string');
    }

    const trimmed = response.trim();
    if (!trimmed) {
      throw new Error('Empty response from rigctld');
    }

    // Handle error responses
    if (trimmed.startsWith('RPRT')) {
      const parts = trimmed.split(' ');
      const code = parseInt(parts[1] || '-1');
      if (code !== 0) {
        throw new Error(`rigctld error: ${code}`);
      }
      return { success: true };
    }

    // Handle numeric responses
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed);
    }

    // Handle float responses
    if (/^\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }
    
    // Handle string responses
    return trimmed;
  }

  async sendCommand(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.socket) {
        reject(new Error('Not connected to rigctld'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, this.config.commandTimeout);

      this.commandQueue.push({
        command,
        resolve,
        reject,
        timeout
      });

      this.socket.write(command + '\n');
    });
  }

  // High-level radio control methods
  async getFrequency(): Promise<number> {
    return await this.sendCommand('f');
  }

  async setFrequency(frequency: number): Promise<void> {
    await this.sendCommand(`F ${frequency}`);
    this.currentRadioState.frequency = frequency;
    this.emit('stateChanged', this.currentRadioState);
  }

  async getMode(): Promise<{ mode: RadioMode; bandwidth: number }> {
    const response = await this.sendCommand('m');

    // Handle case where response is not a string or is empty
    if (typeof response !== 'string' || !response.trim()) {
      throw new Error('Invalid mode response from rigctld');
    }

    const parts = response.trim().split(' ');
    const mode = parts[0] || 'USB';
    const bandwidth = parseInt(parts[1]) || 2400;

    return {
      mode: mode as RadioMode,
      bandwidth
    };
  }

  async setMode(mode: RadioMode, bandwidth?: number): Promise<void> {
    const cmd = bandwidth ? `M ${mode} ${bandwidth}` : `M ${mode}`;
    await this.sendCommand(cmd);
    this.currentRadioState.mode = mode;
    if (bandwidth) this.currentRadioState.bandwidth = bandwidth;
    this.emit('stateChanged', this.currentRadioState);
  }

  async getPowerLevel(): Promise<number> {
    return await this.sendCommand('l RFPOWER');
  }

  async setPowerLevel(power: number): Promise<void> {
    await this.sendCommand(`L RFPOWER ${power}`);
    this.currentRadioState.power = power;
    this.emit('stateChanged', this.currentRadioState);
  }

  async getPTT(): Promise<boolean> {
    const response = await this.sendCommand('t');
    return response === '1';
  }

  async setPTT(enabled: boolean): Promise<void> {
    await this.sendCommand(`T ${enabled ? '1' : '0'}`);
    this.currentRadioState.ptt = enabled;
    this.emit('stateChanged', this.currentRadioState);
  }

  async getRadioInfo(): Promise<{ model: string; version: string }> {
    try {
      const model = await this.sendCommand('_');
      const version = await this.sendCommand('1');
      return { model, version };
    } catch (error) {
      return { model: 'Unknown', version: 'Unknown' };
    }
  }

  async pollRadioState(): Promise<RadioState> {
    try {
      // Poll each value individually with error handling
      const frequency = await this.getFrequency().catch(() => this.currentRadioState.frequency || 14200000);
      const modeInfo = await this.getMode().catch(() => ({ mode: 'USB' as RadioMode, bandwidth: 2400 }));
      const power = await this.getPowerLevel().catch(() => this.currentRadioState.power || 0);
      const ptt = await this.getPTT().catch(() => this.currentRadioState.ptt || false);
      const radioInfo = await this.getRadioInfo().catch(() => ({ model: 'Unknown', version: 'Unknown' }));

      const state: RadioState = {
        frequency,
        mode: modeInfo.mode,
        bandwidth: modeInfo.bandwidth,
        power,
        ptt,
        connected: this.connected,
        model: radioInfo.model,
        squelch: 0, // TODO: Implement squelch reading
        volume: 0,  // TODO: Implement volume reading
        antenna: 1  // TODO: Implement antenna reading
      };

      this.currentRadioState = state;
      this.emit('stateChanged', state);
      
      return state;
    } catch (error) {
      console.error('Error polling radio state:', error);
      throw error;
    }
  }

  getCurrentState(): Partial<RadioState> {
    return { ...this.currentRadioState };
  }

  isConnected(): boolean {
    return this.connected;
  }
}
