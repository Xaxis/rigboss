import { EventEmitter } from 'events';
import type { 
  IService, 
  ServiceRegistry as IServiceRegistry,
  ServiceRegistryEntry, 
  ServiceMetadata 
} from '../types/services.js';

export class ServiceRegistry extends EventEmitter implements IServiceRegistry {
  private services = new Map<string, ServiceRegistryEntry>();

  register(service: IService): void {
    const entry: ServiceRegistryEntry = {
      service,
      metadata: service.getMetadata(),
      registeredAt: Date.now(),
    };

    this.services.set(service.name, entry);

    // Listen for service events (cast to EventEmitter since BaseService extends it)
    const serviceEmitter = service as any;
    if (serviceEmitter.on && typeof serviceEmitter.on === 'function') {
      serviceEmitter.on('statusChanged', (change: any) => {
        this.updateMetadata(service.name);
        this.emit('serviceStatusChanged', { serviceName: service.name, ...change });
      });

      serviceEmitter.on('event', (event: any) => {
        this.emit('serviceEvent', { serviceName: service.name, event });
      });
    }

    this.emit('serviceRegistered', { serviceName: service.name, metadata: entry.metadata });
  }

  unregister(serviceName: string): void {
    const entry = this.services.get(serviceName);
    if (entry) {
      // Remove all listeners (cast to EventEmitter)
      const serviceEmitter = entry.service as any;
      if (serviceEmitter.removeAllListeners && typeof serviceEmitter.removeAllListeners === 'function') {
        serviceEmitter.removeAllListeners();
      }
      this.services.delete(serviceName);
      this.emit('serviceUnregistered', { serviceName });
    }
  }

  get(serviceName: string): IService | undefined {
    return this.services.get(serviceName)?.service;
  }

  getAll(): ServiceRegistryEntry[] {
    return Array.from(this.services.values());
  }

  getMetadata(serviceName: string): ServiceMetadata | undefined {
    const entry = this.services.get(serviceName);
    if (entry) {
      // Update metadata before returning
      this.updateMetadata(serviceName);
      return entry.metadata;
    }
    return undefined;
  }

  getAllMetadata(): ServiceMetadata[] {
    // Update all metadata before returning
    for (const serviceName of this.services.keys()) {
      this.updateMetadata(serviceName);
    }
    return Array.from(this.services.values()).map(entry => entry.metadata);
  }

  // Get services by status
  getRunningServices(): IService[] {
    return this.getAll()
      .filter(entry => entry.service.status === 'running')
      .map(entry => entry.service);
  }

  getHealthyServices(): IService[] {
    return this.getAll()
      .filter(entry => entry.service.getHealth().status === 'healthy')
      .map(entry => entry.service);
  }

  // Bulk operations
  async startAll(): Promise<void> {
    const services = this.getAll().map(entry => entry.service);
    await Promise.all(services.map(service => service.start().catch(err => {
      console.error(`Failed to start service ${service.name}:`, err);
    })));
  }

  async stopAll(): Promise<void> {
    const services = this.getAll().map(entry => entry.service);
    await Promise.all(services.map(service => service.stop().catch(err => {
      console.error(`Failed to stop service ${service.name}:`, err);
    })));
  }

  // Health checking
  checkHealth(): Record<string, ServiceMetadata> {
    const health: Record<string, ServiceMetadata> = {};
    for (const [name, entry] of this.services) {
      health[name] = entry.service.getMetadata();
    }
    return health;
  }

  // Service discovery
  getServicesByCapability(capability: string): IService[] {
    return this.getAll()
      .filter(entry => entry.service.getCapabilities().features.includes(capability))
      .map(entry => entry.service);
  }

  getServiceEndpoints(): Record<string, { http: string[]; socket: string[] }> {
    const endpoints: Record<string, { http: string[]; socket: string[] }> = {};
    for (const [name, entry] of this.services) {
      const capabilities = entry.service.getCapabilities();
      endpoints[name] = {
        http: capabilities.endpoints.http,
        socket: capabilities.endpoints.socket,
      };
    }
    return endpoints;
  }

  private updateMetadata(serviceName: string): void {
    const entry = this.services.get(serviceName);
    if (entry) {
      entry.metadata = entry.service.getMetadata();
    }
  }
}
