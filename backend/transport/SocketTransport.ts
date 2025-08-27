import { Server as SocketIOServer, Socket } from 'socket.io';
import type { ServiceRegistry } from './ServiceRegistry.js';
import type { SocketEvent } from '../types/services.js';

export class SocketTransport {
  private namespaces = new Map<string, any>();

  constructor(
    private io: SocketIOServer,
    private serviceRegistry: ServiceRegistry
  ) {
    this.setupMainNamespace();
    this.setupServiceNamespaces();
    this.setupEventForwarding();
  }

  private setupMainNamespace(): void {
    // Main namespace for service discovery and legacy compatibility
    this.io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);
      
      // Send service discovery info
      socket.emit('services_available', {
        services: this.serviceRegistry.getAllMetadata(),
        endpoints: this.serviceRegistry.getServiceEndpoints(),
        timestamp: Date.now(),
      });

      // Send current health status
      socket.emit('health_status', this.serviceRegistry.checkHealth());

      // Legacy compatibility - emit connection status for existing frontend
      this.emitLegacyConnectionStatus(socket);

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      // Handle service discovery requests
      socket.on('get_services', () => {
        socket.emit('services_available', {
          services: this.serviceRegistry.getAllMetadata(),
          endpoints: this.serviceRegistry.getServiceEndpoints(),
          timestamp: Date.now(),
        });
      });

      socket.on('get_health', () => {
        socket.emit('health_status', this.serviceRegistry.checkHealth());
      });
    });
  }

  private setupServiceNamespaces(): void {
    // Radio namespace
    const radioNamespace = this.io.of('/radio');
    this.namespaces.set('radio', radioNamespace);
    
    radioNamespace.on('connection', (socket: Socket) => {
      console.log('Radio client connected:', socket.id);
      
      // Send current radio state if available
      const radioService = this.serviceRegistry.get('radio');
      if (radioService && (radioService as any).getCurrentState) {
        const state = (radioService as any).getCurrentState();
        if (state) {
          socket.emit('state_changed', state);
        }
      }

      socket.on('disconnect', () => {
        console.log('Radio client disconnected:', socket.id);
      });
    });

    // Audio namespace
    const audioNamespace = this.io.of('/audio');
    this.namespaces.set('audio', audioNamespace);
    
    audioNamespace.on('connection', (socket: Socket) => {
      console.log('Audio client connected:', socket.id);
      
      // Send current audio status
      const audioService = this.serviceRegistry.get('audio');
      if (audioService) {
        socket.emit('audio_status', {
          available: (audioService as any).isAvailable(),
          streaming: (audioService as any).isStreaming(),
        });
      }

      socket.on('disconnect', () => {
        console.log('Audio client disconnected:', socket.id);
      });
    });

    // Spectrum namespace
    const spectrumNamespace = this.io.of('/spectrum');
    this.namespaces.set('spectrum', spectrumNamespace);
    
    spectrumNamespace.on('connection', (socket: Socket) => {
      console.log('Spectrum client connected:', socket.id);
      
      // Send current spectrum settings
      const spectrumService = this.serviceRegistry.get('spectrum');
      if (spectrumService) {
        socket.emit('spectrum_settings', (spectrumService as any).getSettings());
        socket.emit('spectrum_status', {
          analyzing: (spectrumService as any).isAnalyzing(),
        });
      }

      socket.on('disconnect', () => {
        console.log('Spectrum client disconnected:', socket.id);
      });
    });

    // Config namespace
    const configNamespace = this.io.of('/config');
    this.namespaces.set('config', configNamespace);
    
    configNamespace.on('connection', (socket: Socket) => {
      console.log('Config client connected:', socket.id);

      socket.on('disconnect', () => {
        console.log('Config client disconnected:', socket.id);
      });
    });
  }

  private setupEventForwarding(): void {
    // Forward service events to appropriate namespaces and main namespace
    this.serviceRegistry.on('serviceEvent', ({ serviceName, event }) => {
      this.forwardServiceEvent(serviceName, event);
    });

    // Forward service status changes
    this.serviceRegistry.on('serviceStatusChanged', (statusChange) => {
      this.io.emit('service_status_changed', statusChange);

      // Update legacy connection status if radio service changed
      if (statusChange.serviceName === 'radio') {
        this.broadcastLegacyConnectionStatus();
      }
    });

    // Radio event forwarding is handled in server.ts after service registration
  }

  private forwardServiceEvent(serviceName: string, event: SocketEvent): void {
    // Emit to service-specific namespace
    const namespace = this.namespaces.get(serviceName);
    if (namespace) {
      namespace.emit(event.type, event.data);
    }

    // Emit to main namespace for legacy compatibility
    this.io.emit(event.type, event.data);

    // Special handling for specific events
    this.handleSpecialEvents(serviceName, event);
  }

  private handleSpecialEvents(serviceName: string, event: SocketEvent): void {
    if (serviceName === 'radio') {
      // Legacy compatibility for radio events
      if (event.type === 'state_changed') {
        this.io.emit('radio_state', event.data);
        this.io.emit('connection_status', {
          connected: true,
          radio: event.data.model || 'Connected'
        });
      }
      
      if (event.type === 'connected') {
        this.io.emit('connection_status', {
          connected: true,
          radio: 'Connected'
        });
      }
      
      if (event.type === 'disconnected') {
        this.io.emit('connection_status', {
          connected: false,
          radio: 'Disconnected'
        });
      }
    }

    if (serviceName === 'audio') {
      // Forward audio events for spectrum processing
      if (event.type === 'pcm_samples') {
        // Emit PCM samples for spectrum analysis
        this.namespaces.get('spectrum')?.emit('pcm_samples', event.data);
      }
    }

    if (serviceName === 'spectrum') {
      // Forward spectrum frames to clients
      if (event.type === 'frame_generated') {
        this.namespaces.get('spectrum')?.emit('spectrum_frame', event.data);
      }
    }
  }

  private emitLegacyConnectionStatus(socket: Socket): void {
    const radioService = this.serviceRegistry.get('radio');
    if (radioService) {
      const health = radioService.getHealth();
      socket.emit('connection_status', {
        connected: health.details?.rigctldConnected || false,
        radio: health.details?.lastState || 'Unknown'
      });
    }
  }

  private broadcastLegacyConnectionStatus(): void {
    const radioService = this.serviceRegistry.get('radio');
    if (radioService) {
      const health = radioService.getHealth();
      this.io.emit('connection_status', {
        connected: health.details?.rigctldConnected || false,
        radio: health.details?.lastState || 'Unknown'
      });
    }
  }

  // Utility methods
  getNamespace(name: string): any {
    return this.namespaces.get(name);
  }

  broadcastToService(serviceName: string, event: string, data: any): void {
    const namespace = this.namespaces.get(serviceName);
    if (namespace) {
      namespace.emit(event, data);
    }
  }

  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  getConnectedClients(): { total: number; byNamespace: Record<string, number> } {
    const result = {
      total: this.io.engine.clientsCount,
      byNamespace: {} as Record<string, number>,
    };

    for (const [name, namespace] of this.namespaces) {
      result.byNamespace[name] = namespace.sockets.size;
    }

    return result;
  }
}
