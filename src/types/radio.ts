// Core radio types and interfaces for rigboss

export interface AudioLevels {
  af: number;        // Audio Frequency (Volume) 0-100
  rf: number;        // RF Gain 0-100
  micGain: number;   // Microphone Gain 0-100
  rfPower: number;   // RF Power Output 0-100
  sql: number;       // Squelch 0-100
  voxGain: number;   // VOX Sensitivity 0-100
  comp: number;      // Speech Compressor 0-100
  nr: number;        // Noise Reduction 0-100
  agc: number;       // AGC Mode (0=OFF, 1=SUPERFAST, 2=FAST, 3=MEDIUM, 4=SLOW, 5=USER, 6=AUTO)
  preamp: number;    // Preamplifier dB
  att: number;       // Attenuator dB
}

export interface AudioFunctions {
  vox: boolean;      // Voice Operated Transmission
  comp: boolean;     // Speech Compressor Enable
  nr: boolean;       // Noise Reduction Enable
  notch: boolean;    // Notch Filter Enable
}

export interface RadioState {
  frequency: number;
  mode: RadioMode;
  bandwidth: number;
  power: number;
  squelch: number;
  volume: number;
  antenna: number;
  ptt: boolean;
  connected: boolean;
  model: string;
  serialNumber?: string;
  audioLevels?: AudioLevels;
  audioFunctions?: AudioFunctions;
}

export type RadioMode = 
  | 'LSB' 
  | 'USB' 
  | 'CW' 
  | 'CWR' 
  | 'AM' 
  | 'FM' 
  | 'WFM' 
  | 'RTTY' 
  | 'RTTYR' 
  | 'PSK' 
  | 'PSKR' 
  | 'FT8' 
  | 'FT4' 
  | 'DATA';

export interface BandInfo {
  name: string;
  start: number;
  end: number;
  modes: RadioMode[];
  defaultMode: RadioMode;
  defaultFrequency: number;
}

export interface MemoryChannel {
  number: number;
  name: string;
  frequency: number;
  mode: RadioMode;
  bandwidth: number;
  antenna: number;
  ctcss?: number;
  dcs?: number;
}

export interface RadioCapabilities {
  frequencyRange: {
    min: number;
    max: number;
  };
  modes: RadioMode[];
  maxPower: number;
  antennas: number;
  hasSpectrum: boolean;
  hasWaterfall: boolean;
  hasAudio: boolean;
  memoryChannels: number;
  bandStackRegisters: number;
}

export interface SpectrumData {
  frequencies: number[];
  levels: number[];
  centerFrequency: number;
  span: number;
  timestamp: number;
}

export interface WaterfallData {
  data: number[][];
  width: number;
  height: number;
  timestamp: number;
}

export interface AudioSettings {
  inputDevice?: string;
  outputDevice?: string;
  inputGain: number;
  outputGain: number;
  micGain: number;
  speakerVolume: number;
  enableNoiseBlanker: boolean;
  enableNoiseReduction: boolean;
  enableAGC: boolean;
  compressorLevel: number;
}

export interface RigctlCommand {
  command: string;
  parameters?: (string | number)[];
}

export interface RigctlResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// WebSocket message types
export type WebSocketMessage = 
  | { type: 'radio_state'; data: RadioState }
  | { type: 'spectrum_data'; data: SpectrumData }
  | { type: 'waterfall_data'; data: WaterfallData }
  | { type: 'command'; data: RigctlCommand }
  | { type: 'response'; data: RigctlResponse }
  | { type: 'error'; data: { message: string; code?: string } }
  | { type: 'connection_status'; data: { connected: boolean; radio?: string } };

// Configuration types
export interface RadioConfig {
  model: string;
  port: string;
  baudRate: number;
  rigctldHost: string;
  rigctldPort: number;
  pollInterval: number;
  audioEnabled: boolean;
  spectrumEnabled: boolean;
}

export interface AppConfig {
  radio: RadioConfig;
  audio: AudioSettings;
  ui: {
    theme: 'light' | 'dark' | 'auto';
    touchOptimized: boolean;
    showSpectrum: boolean;
    showWaterfall: boolean;
    frequencyStep: number;
  };
  network: {
    serverHost: string;
    serverPort: number;
    allowRemoteConnections: boolean;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'command' | 'frequency' | 'mode' | 'power' | 'ptt' | 'connection' | 'error' | 'info';
  message: string;
  details?: any;
  success: boolean;
}
