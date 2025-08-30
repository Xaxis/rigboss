// WebSocket event constants
export const EVENTS = {
  // Radio events
  RADIO_STATE: 'radio:state',
  RADIO_CONNECTED: 'radio:connected',
  RADIO_DISCONNECTED: 'radio:disconnected',
  RADIO_CAPABILITIES: 'radio:capabilities',
  RADIO_ERROR: 'radio:error',
  
  // Spectrum events
  SPECTRUM_FRAME: 'spectrum:frame',
  
  // Audio events
  AUDIO_LEVEL: 'audio:level',
  AUDIO_ERROR: 'audio:error',
  
  // System events
  SYSTEM_STATUS: 'system:status',
} as const;

export type EventName = typeof EVENTS[keyof typeof EVENTS];

// Event payload types
export interface RadioStateEvent {
  timestamp: number;
  state: any; // Will be defined in radio/types.ts
}

export interface RadioConnectionEvent {
  connected: boolean;
  host?: string;
  port?: number;
  error?: string;
}

export interface RadioCapabilitiesEvent {
  capabilities: any; // Will be defined in radio/types.ts
}

export interface SpectrumFrameEvent {
  timestamp: number;
  startHz: number;
  binSizeHz: number;
  bins: number[];
}

export interface AudioLevelEvent {
  input: number;
  output: number;
}

export interface SystemStatusEvent {
  uptime: number;
  memory: {
    used: number;
    total: number;
  };
  radio: {
    connected: boolean;
    queueSize: number;
  };
  audio: {
    enabled: boolean;
    active: boolean;
  };
}
