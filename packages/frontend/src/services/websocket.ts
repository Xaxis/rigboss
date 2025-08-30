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
      console.log('📻 Frontend received radio state:', data);
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


    // Listen for spectrum settings
    this.socket.on('spectrum:settings', (data: any) => {
      import('../stores/spectrum').then(({ useSpectrumStore }) => {
        if (data?.settings) {
          useSpectrumStore.setState((prev: any) => ({ settings: { ...prev.settings, ...data.settings }, connected: data.available !== false ? true : prev.connected }));
        }
      });
    });
    // Listen for audio levels
    this.socket.on('audio:level', (data: any) => {
      import('../stores/audio').then(({ useAudioStore }) => {
        useAudioStore.getState().updateLevels(data);
      }).catch(() => {}); // Audio store might not exist yet
    });

    // Listen for system status
    this.socket.on('system:status', (data: any) => {
      console.log('🖥️ System status:', data);
    });
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

  async emitWithAck<T = any>(event: string, data?: any, timeoutMs = 8000): Promise<T> {
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
