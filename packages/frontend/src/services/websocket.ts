import { io, Socket } from 'socket.io-client';
import type { WSEvent, ConnectionState } from '@/types';
import { getConfig } from '@/lib/config';

type EventHandler = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private connectionState: ConnectionState = {
    connected: false,
    reconnecting: false,
    error: null,
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.url, {
          transports: ['websocket'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.connectionState = {
            connected: true,
            reconnecting: false,
            error: null,
          };
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers();

          // Refresh audio devices when WebSocket connects
          setTimeout(() => {
            import('../stores/audio-new').then(({ useAudioControlStore }) => {
              useAudioControlStore.getState().refreshDevices();
            });
          }, 100); // Small delay to ensure setupEventListeners is called

          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.connectionState = {
            connected: false,
            reconnecting: reason === 'io server disconnect' ? false : true,
            error: reason,
          };
          this.notifyConnectionHandlers();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.connectionState = {
            connected: false,
            reconnecting: this.reconnectAttempts < this.maxReconnectAttempts,
            error: error.message,
          };
          this.reconnectAttempts++;
          this.notifyConnectionHandlers();

          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(error);
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('WebSocket reconnected after', attemptNumber, 'attempts');
          this.connectionState = {
            connected: true,
            reconnecting: false,
            error: null,
          };
          this.reconnectAttempts = 0;
          this.notifyConnectionHandlers();
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('WebSocket reconnection error:', error);
          this.connectionState = {
            connected: false,
            reconnecting: true,
            error: error.message,
          };
          this.notifyConnectionHandlers();
        });

        this.socket.on('reconnect_failed', () => {
          console.error('WebSocket reconnection failed');
          this.connectionState = {
            connected: false,
            reconnecting: false,
            error: 'Reconnection failed',
          };
          this.notifyConnectionHandlers();
        });

        // Handle all custom events
        this.socket.onAny((eventName: string, data: any) => {
          this.notifyEventHandlers(eventName, data);
        });

        // Set up radio event listeners
        this.setupRadioEventListeners();

      } catch (error) {
        reject(error);
      }
    });
  }

  private setupRadioEventListeners(): void {
    if (!this.socket) return;

    // Listen for radio state updates (matches backend EVENTS.RADIO_STATE)
    this.socket.on('radio:state', (data: any) => {
      try {
        import('../stores/radio').then(({ useRadioStore }) => {
          useRadioStore.getState().updateFromBackend(data.state);
        });
      } catch (e) {
        console.error('Failed to update radio store from WS data', e);
      }
    });

    // Listen for radio connection events
    this.socket.on('radio:connected', (data: any) => {
      console.log('📻 Radio connected:', data);
      import('../stores/radio').then(({ useRadioStore }) => {
        useRadioStore.getState().updateFromBackend({ connected: true });
      });
    });

    this.socket.on('radio:disconnected', (data: any) => {
      console.log('📻 Radio disconnected:', data);
      import('../stores/radio').then(({ useRadioStore }) => {
        useRadioStore.getState().updateFromBackend({ connected: false });
      });
    });

    // Listen for radio capabilities
    this.socket.on('radio:capabilities', (data: any) => {
      console.log('📻 Radio capabilities:', data);
      import('../stores/radio').then(({ useRadioStore }) => {
        useRadioStore.getState().updateCapabilities(data.capabilities);
      });
    });

    // Listen for radio errors
    this.socket.on('radio:error', (data: any) => {
      console.error('📻 Radio error:', data);
      import('../stores/ui').then(({ toast }) => {
        toast.error('Radio Error', data.error || 'Unknown radio error');
      });
    });


    // Listen for spectrum frames
    this.socket.on('spectrum:frame', (data: any) => {
      import('../stores/spectrum').then(({ useSpectrumStore }) => {
        useSpectrumStore.getState().updateFrame(data);
        useSpectrumStore.setState({ connected: true });
      });
    });


    // Listen for spectrum status/settings
    this.socket.on('spectrum:settings', (data: any) => {
      import('../stores/spectrum').then(({ useSpectrumStore }) => {
        if (data?.settings) {
          const meta = {
            available: data.available,
            device: data.device,
            provider: data.provider,
            fps: data.fps,
          };

          // NEVER override user display settings (centerHz, spanHz)
          // Only update non-display backend settings
          const backendSettings: any = {};
          if (data.settings.fftSize !== undefined) backendSettings.fftSize = data.settings.fftSize;
          if (data.settings.averaging !== undefined) backendSettings.averaging = data.settings.averaging;
          if (data.settings.refLevel !== undefined) backendSettings.refLevel = data.settings.refLevel;
          if (data.settings.coupled !== undefined) backendSettings.coupled = data.settings.coupled;

          useSpectrumStore.setState((prev: any) => ({
            settings: { ...prev.settings, ...backendSettings },
            connected: data.available !== false ? true : prev.connected,
            meta,
          }));
        }
      });
    });
    // Listen for audio levels
    this.socket.on('audio:level', (data: any) => {
      import('../stores/audio').then(({ useAudioStore }) => {
        useAudioStore.getState().updateLevels(data);
      }).catch(() => {}); // Audio store might not exist yet
    });

    // Listen for audio events
    this.socket.on('audio:started', (data: any) => {
      import('../stores/audio').then(({ useAudioStore }) => {
        useAudioStore.getState().setConnected(true);
      }).catch(() => {});
    });

    this.socket.on('audio:stopped', (data: any) => {
      import('../stores/audio').then(({ useAudioStore }) => {
        useAudioStore.getState().setConnected(false);
      }).catch(() => {});
    });

    this.socket.on('audio:error', (data: any) => {
      console.error('🔊 Audio error:', data);
      import('../stores/audio').then(({ useAudioStore }) => {
        useAudioStore.getState().setConnected(false);
      }).catch(() => {});
    });

    // Listen for RX audio data and play it
    this.socket.on('audio:rx_data', (data: any) => {
      import('../stores/audio-new').then(({ useAudioControlStore }) => {
        const controlState = useAudioControlStore.getState();

        if (controlState.audioContext && controlState.outputLevel > 0 && !controlState.muted) {
          // Convert Array back to ArrayBuffer
          const buffer = new Uint8Array(data.data).buffer;
          this.playAudioData(buffer, controlState.audioContext, controlState.outputLevel / 100);
        }
      }).catch(() => {});
    });

    // Listen for system status
    this.socket.on('system:status', (data: any) => {
      console.log('🖥️ System status:', data);
    });
  }

  private masterGainNode: GainNode | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private lastLevelUpdate = 0;

  private playAudioData(audioData: ArrayBuffer, audioContext: AudioContext, volume: number): void {
    try {
      if (audioData.byteLength === 0) return;

      // Create simple audio chain if it doesn't exist
      if (!this.masterGainNode) {
        this.masterGainNode = audioContext.createGain();
        this.masterGainNode.connect(audioContext.destination);
      }

      // Update master volume smoothly to prevent clicks
      this.masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);

      // Convert and play audio immediately (no queue to prevent stuttering)
      const sampleCount = audioData.byteLength / 2;
      const audioBuffer = audioContext.createBuffer(1, sampleCount, 48000);
      const channelData = audioBuffer.getChannelData(0);

      // Convert 16-bit PCM to float32
      const view = new Int16Array(audioData);
      let sumSquares = 0;
      let maxSample = 0;

      for (let i = 0; i < view.length; i++) {
        const sample = view[i] / 32768.0;
        channelData[i] = sample;

        // Calculate levels for meters
        const absSample = Math.abs(sample);
        sumSquares += sample * sample;
        maxSample = Math.max(maxSample, absSample);
      }

      // Create and play audio source immediately
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.masterGainNode);
      source.start();

      // Update level meters with throttling
      this.updateLevelMeters(sumSquares, view.length, maxSample);
    } catch (error) {
      console.error('🔊 Failed to play audio data:', error);
    }
  }

  private updateLevelMeters(sumSquares: number, sampleCount: number, maxSample: number): void {
    // Calculate proper RMS level
    const rmsLevel = Math.sqrt(sumSquares / sampleCount);
    const peakLevel = maxSample;

    // Update level meters with throttling (max 10fps)
    const now = Date.now();
    if (now - this.lastLevelUpdate > 100) {
      this.lastLevelUpdate = now;
      import('../stores/audio-new').then(({ useAudioDisplayStore }) => {
        useAudioDisplayStore.getState().updateLevels({
          output: Math.min(rmsLevel * 2, 1) // Boost for visibility, clamp to 1
        });
      });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionState = {
      connected: false,
      reconnecting: false,
      error: null,
    };
    this.notifyConnectionHandlers();
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }

  async emitWithAck<T = any>(event: string, data?: any, timeoutMs = 15000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      try {
        // socket.io ack with timeout
        (this.socket as any)
          .timeout(timeoutMs)
          .emit(event, data, (err: any, res: T) => {
            if (err) return reject(typeof err === 'string' ? new Error(err) : err);
            resolve(res);
          });
      } catch (e) {
        reject(e as any);
      }
    });
  }

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(event);
        }
      }
    };
  }

  private notifyEventHandlers(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  private notifyConnectionHandlers(): void {
    this.notifyEventHandlers('connection_state', this.connectionState);
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  isConnected(): boolean {
    return this.connectionState.connected;
  }
}

let wsService: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    const config = getConfig();
    wsService = new WebSocketService(config.wsUrl);
  }
  return wsService;
}

export async function initializeWebSocket(): Promise<WebSocketService> {
  const service = getWebSocketService();
  await service.connect();
  return service;
}

export function disconnectWebSocket(): void {
  if (wsService) {
    wsService.disconnect();
    wsService = null;
  }
}
