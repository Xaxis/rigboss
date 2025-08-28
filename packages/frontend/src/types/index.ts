// Core application types
export type Panel = 'radio' | 'spectrum' | 'audio' | 'memory' | 'log' | 'settings';

export type Theme = 'light' | 'dark' | 'system';

// Radio types
export type RadioMode = 'LSB' | 'USB' | 'CW' | 'CWR' | 'AM' | 'FM' | 'WFM' | 'RTTY' | 'RTTYR' | 'PSK' | 'PSKR';

export type VFO = 'A' | 'B';

export interface RadioState {
  connected: boolean;
  frequency: number;
  mode: RadioMode;
  power: number;
  vfo: VFO;
  split: boolean;
  ptt: boolean;
  tuning: boolean;
  swr: number;
  signalStrength: number;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
}

export interface RadioInfo {
  model: string;
  serialNumber: string;
  firmwareVersion: string;
}

// Spectrum types
export type SpectrumSource = 'AUTO' | 'IF' | 'IQ' | 'PCM';
export type SpectrumMode = 'spectrum' | 'waterfall' | 'combined';

export interface SpectrumSettings {
  centerHz: number;
  spanHz: number;
  fftSize: number;
  averaging: number;
  refLevel: number;
  colorMap: string;
}

export interface SpectrumFrame {
  timestamp: number;
  startHz: number;
  binSizeHz: number;
  db: number[];
}

export interface SpectrumState {
  settings: SpectrumSettings;
  frame: SpectrumFrame | null;
  connected: boolean;
  source: SpectrumSource;
  fullscreen: boolean;
  mode: SpectrumMode;
}

// Audio types
export interface AudioDevice {
  id: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

export interface AudioState {
  inputDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  selectedInputDevice: string | null;
  selectedOutputDevice: string | null;
  inputLevel: number;
  outputLevel: number;
  muted: boolean;
  recording: boolean;
  playing: boolean;
  connected: boolean;
}

// UI types
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
}

export interface AppSettings {
  theme: Theme;
  backendUrl: string;
  autoConnect: boolean;
  showSpectrum: boolean;
  spectrumPosition: 'top' | 'bottom';
  audioAutoStart: boolean;
  toastPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  logFormat: 'adif' | 'cabrillo';
  callsign: string;
  grid: string;
  qth: string;
  power: number;
  antennaInfo: string;
  rigModel: string;
}

export interface UIState {
  sidebarOpen: boolean;
  activePanel: Panel;
  loading: boolean;
  error: string | null;
  toasts: Toast[];
}

// WebSocket types
export interface WSEvent {
  type: string;
  data: any;
}

export interface ConnectionState {
  connected: boolean;
  reconnecting: boolean;
  error: string | null;
}

// Configuration types
export interface Config {
  backendUrl: string;
  wsUrl: string;
  apiTimeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}
