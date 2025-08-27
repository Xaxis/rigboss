import { io, Socket } from 'socket.io-client';
import type { WebSocketMessage, RadioState, RigctlCommand } from '@/types/radio';

// Provided by Vite define() in astro.config.mjs when present
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const __BACKEND_URL__: string | undefined;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      // Auto-detect backend URL based on current location
      let resolvedUrl = url;
      if (!resolvedUrl) {
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
          // Local dev: backend on 3001
          resolvedUrl = 'http://localhost:3001';
        } else {
          // Pi deployment: same host, port 3001
          resolvedUrl = `http://${currentHost}:3001`;
        }
      }
      this.socket = io(resolvedUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'], // Try polling first
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.socket.on('connect', () => {
        console.log('Connected to rigboss backend');
        this.reconnectAttempts = 0;
        this.emit('connected', true);
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from backend:', reason);
        this.emit('connected', false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.emit('error', new Error('Failed to connect after multiple attempts'));
          reject(error);
        }
      });

      // Handle incoming messages
      this.socket.on('radio_state', (data: RadioState) => {
        this.emit('radio_state', data);
      });

      this.socket.on('connection_status', (data: { connected: boolean; radio?: string }) => {
        this.emit('connection_status', data);
      });

      this.socket.on('response', (data: any) => {
        this.emit('response', data);
      });

      this.socket.on('error', (data: { message: string; code?: string }) => {
        this.emit('error', new Error(data.message));
      });

      this.socket.on('spectrum_data', (data: any) => {
        this.emit('spectrum_data', data);
      });

      this.socket.on('waterfall_data', (data: any) => {
        this.emit('waterfall_data', data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Event emitter functionality
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Radio control methods
  async sendCommand(command: string, parameters?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to backend'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'));
      }, 5000);

      const responseHandler = (response: any) => {
        clearTimeout(timeout);
        this.socket?.off('response', responseHandler);
        
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Command failed'));
        }
      };

      this.socket.on('response', responseHandler);
      this.socket.emit('command', {
        type: 'command',
        data: { command, parameters }
      });
    });
  }

  async setFrequency(frequency: number): Promise<void> {
    await this.sendCommand('set_frequency', [frequency]);
  }

  async setMode(mode: string, bandwidth?: number): Promise<void> {
    await this.sendCommand('set_mode', [mode, bandwidth]);
  }

  async setPowerLevel(power: number): Promise<void> {
    await this.sendCommand('set_power', [power]);
  }

  async setPTT(enabled: boolean): Promise<void> {
    await this.sendCommand('set_ptt', [enabled]);
  }

  async getFrequency(): Promise<number> {
    return await this.sendCommand('get_frequency');
  }

  async getMode(): Promise<{ mode: string; bandwidth: number }> {
    return await this.sendCommand('get_mode');
  }

  async getPowerLevel(): Promise<number> {
    return await this.sendCommand('get_power');
  }

  async getPTT(): Promise<boolean> {
    return await this.sendCommand('get_ptt');
  }

  async getRadioInfo(): Promise<{ model: string; version: string }> {
    return await this.sendCommand('get_radio_info');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
