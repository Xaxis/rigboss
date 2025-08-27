import { EventEmitter } from 'events';
import type { 
  IService, 
  ServiceStatus, 
  ServiceHealth, 
  ServiceCapabilities, 
  ServiceMetadata 
} from '../types/services.js';

export abstract class BaseService extends EventEmitter implements IService {
  protected _status: ServiceStatus = 'stopped';
  protected _startTime: number = 0;
  protected _lastHealthCheck: number = 0;

  constructor(
    public readonly name: string,
    public readonly version: string,
    protected readonly description: string
  ) {
    super();
  }

  get status(): ServiceStatus {
    return this._status;
  }

  async start(): Promise<void> {
    if (this._status === 'running') {
      return;
    }

    this._status = 'starting';
    this._startTime = Date.now();
    
    try {
      await this.onStart();
      this._status = 'running';
      this.emit('started');
    } catch (error) {
      this._status = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this._status === 'stopped') {
      return;
    }

    try {
      await this.onStop();
      this._status = 'stopped';
      this.emit('stopped');
    } catch (error) {
      this._status = 'error';
      this.emit('error', error);
      throw error;
    }
  }

  getHealth(): ServiceHealth {
    this._lastHealthCheck = Date.now();
    
    const baseHealth: ServiceHealth = {
      status: this._status === 'running' ? 'healthy' : 'unhealthy',
      uptime: this._status === 'running' ? Date.now() - this._startTime : 0,
      lastCheck: this._lastHealthCheck,
    };

    const customHealth = this.onGetHealth();
    return { ...baseHealth, ...customHealth };
  }

  getCapabilities(): ServiceCapabilities {
    return this.onGetCapabilities();
  }

  getMetadata(): ServiceMetadata {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      status: this._status,
      health: this.getHealth(),
      capabilities: this.getCapabilities(),
    };
  }

  // Abstract methods for subclasses to implement
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onGetHealth(): Partial<ServiceHealth>;
  protected abstract onGetCapabilities(): ServiceCapabilities;

  // Utility methods
  protected setStatus(status: ServiceStatus): void {
    if (this._status !== status) {
      const oldStatus = this._status;
      this._status = status;
      this.emit('statusChanged', { from: oldStatus, to: status });
    }
  }

  protected emitEvent(type: string, data: any): void {
    this.emit('event', {
      type,
      data,
      timestamp: Date.now(),
      service: this.name,
      version: this.version,
    });
  }

  // Health check helpers
  protected isHealthy(): boolean {
    return this._status === 'running';
  }

  protected getUptime(): number {
    return this._status === 'running' ? Date.now() - this._startTime : 0;
  }
}
