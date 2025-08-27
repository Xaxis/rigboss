import { BaseService } from './BaseService.js';
import { WebRTCAudioService } from './WebRTCAudioService.js';
import type { Socket } from 'socket.io';
import type {
  IAudioService,
  ServiceHealth,
  ServiceCapabilities
} from '../types/services.js';

export class AudioService extends BaseService implements IAudioService {
  private webrtcService: WebRTCAudioService | null = null;
  private config: any;
  private streaming = false;
  private io: any; // SocketIOServer will be injected

  constructor(config: any, io?: any) {
    super('audio', '1.0.0', 'Audio streaming and processing');
    this.config = config;
    this.io = io;
  }

  // Method to inject SocketIO server after construction
  setSocketIO(io: any): void {
    this.io = io;
  }

  protected async onStart(): Promise<void> {
    if (!this.io) {
      console.warn('[AudioService] No SocketIO server provided - audio service will have limited functionality');
      return;
    }

    // Initialize WebRTC audio service with SocketIO
    this.webrtcService = new WebRTCAudioService(this.io);
    await this.webrtcService.init();

    // Attach the audio namespace to SocketIO
    this.webrtcService.attachNamespace();

    // Setup event monitoring for the audio namespace
    this.setupAudioNamespaceMonitoring();

    // Check if audio is available
    if (this.isAvailable()) {
      this.emitEvent('audio_available', { available: true });
    } else {
      this.emitEvent('audio_available', { available: false });
    }
  }

  protected async onStop(): Promise<void> {
    await this.stopStreaming();
    this.webrtcService = null;
  }

  protected onGetHealth(): Partial<ServiceHealth> {
    return {
      status: this.isAvailable() ? 'healthy' : 'degraded',
      details: {
        available: this.isAvailable(),
        streaming: this.streaming,
        webrtcInitialized: !!this.webrtcService,
      },
    };
  }

  protected onGetCapabilities(): ServiceCapabilities {
    return {
      features: ['audio_streaming', 'pcm_output', 'level_control', 'tx_audio'],
      version: this.version,
      endpoints: {
        http: ['/api/audio/start', '/api/audio/stop', '/api/audio/levels', '/api/audio/status'],
        socket: ['/audio'],
      },
      dependencies: ['ffmpeg'],
    };
  }

  // IAudioService implementation
  isAvailable(): boolean {
    return this.webrtcService?.isAvailable() || false;
  }

  async startStreaming(): Promise<void> {
    if (!this.webrtcService) {
      throw new Error('Audio service not initialized');
    }

    if (!this.isAvailable()) {
      throw new Error('Audio not available - ffmpeg may not be installed');
    }

    if (this.streaming) {
      return; // Already streaming
    }

    try {
      // WebRTCAudioService manages streaming through socket connections
      // The streaming starts when clients connect to the /audio namespace and send 'start-audio'
      // We just mark that streaming is enabled
      this.streaming = true;
      this.emitEvent('streaming_started', {
        available: this.isAvailable(),
        clients: this.getConnectedClients()
      });
    } catch (error) {
      this.emitEvent('streaming_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async stopStreaming(): Promise<void> {
    if (!this.streaming || !this.webrtcService) {
      return;
    }

    try {
      // Stop streaming for all connected clients
      // WebRTCAudioService will handle the actual ffmpeg process cleanup
      this.streaming = false;
      this.emitEvent('streaming_stopped', {
        clients: this.getConnectedClients()
      });
    } catch (error) {
      this.emitEvent('streaming_stop_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  isStreaming(): boolean {
    return this.streaming;
  }

  async setAudioLevel(level: string, value: number): Promise<void> {
    if (!this.webrtcService) {
      throw new Error('Audio service not initialized');
    }

    // WebRTCAudioService doesn't have level control yet
    // This is a placeholder for future implementation
    this.emitEvent('level_changed', { level, value });
  }

  async getAudioLevels(): Promise<Record<string, number>> {
    // Placeholder - WebRTCAudioService doesn't expose levels yet
    return {
      input: 0,
      output: 0,
    };
  }

  setTxEnabled(enabled: boolean): void {
    if (!this.webrtcService) {
      throw new Error('Audio service not initialized');
    }

    // Use the WebRTCAudioService setTxEnabled method
    this.webrtcService.setTxEnabled(enabled);
    this.emitEvent('tx_enabled_changed', { enabled });
  }

  // Additional methods for service management
  getWebRTCService(): WebRTCAudioService | null {
    return this.webrtcService;
  }

  // Setup monitoring of the audio namespace for events
  private setupAudioNamespaceMonitoring(): void {
    if (!this.io) return;

    const audioNamespace = this.io.of('/audio');

    // Monitor client connections
    audioNamespace.on('connection', (socket: Socket) => {
      this.emitEvent('client_connected', {
        clientId: socket.id,
        totalClients: this.getConnectedClients()
      });

      // Monitor audio events from clients
      socket.on('start-audio', () => {
        this.emitEvent('client_started_audio', {
          clientId: socket.id,
          available: this.isAvailable()
        });
      });

      socket.on('stop-audio', () => {
        this.emitEvent('client_stopped_audio', {
          clientId: socket.id
        });
      });

      socket.on('mic-data', (audioData: ArrayBuffer) => {
        // Forward PCM samples for spectrum analysis
        this.emitEvent('pcm_samples', {
          samples: new Float32Array(audioData),
          sampleRate: 48000,
          clientId: socket.id
        });
      });

      socket.on('disconnect', () => {
        this.emitEvent('client_disconnected', {
          clientId: socket.id,
          totalClients: this.getConnectedClients()
        });
      });
    });
  }

  // Helper method to get connected client count
  private getConnectedClients(): number {
    if (!this.io) return 0;
    const audioNamespace = this.io.of('/audio');
    return audioNamespace.sockets.size;
  }
}
