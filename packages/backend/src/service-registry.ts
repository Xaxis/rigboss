import type { ServiceHealth, ServiceMetadata } from "./types.js";

export interface Service {
  metadata: ServiceMetadata;
  getHealth: () => Promise<ServiceHealth>;
}

export class ServiceRegistry {
  private services = new Map<string, Service>();

  register(service: Service) {
    this.services.set(service.metadata.name, service);
  }

  unregister(name: string) {
    this.services.delete(name);
  }

  listMetadata(): ServiceMetadata[] {
    return Array.from(this.services.values()).map((s) => s.metadata);
  }

  async checkHealth(): Promise<ServiceHealth[]> {
    const entries = Array.from(this.services.values());
    return Promise.all(entries.map((s) => s.getHealth()));
  }
}

