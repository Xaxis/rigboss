// Core application types
export type Panel = 'radio' | 'spectrum' | 'audio' | 'memory' | 'log' | 'settings';

export type Theme = 'light' | 'dark' | 'system';

// Radio types - matches backend comprehensive state
export type RadioMode = 'LSB' | 'USB' | 'CW' | 'CWR' | 'AM' | 'FM' | 'WFM' | 'RTTY' | 'RTTYR' | 'PSK' | 'PSKR';

export type VFO = 'A' | 'B' | 'VFOA' | 'VFOB' | 'MEM';

export interface RadioState {
  connected: boolean;

  // Core frequency/mode/power
  frequencyHz?: number;
  mode?: string;
  bandwidthHz?: number;
  power?: number;
  ptt?: boolean;
  tuning?: boolean;

  // VFO operations
  vfo?: string;
  split?: boolean;
  splitFrequencyHz?: number;
  splitMode?: string;
  splitBandwidthHz?: number;

  // RIT/XIT
  rit?: number;
  xit?: number;

  // Antenna
  antenna?: number;
  antennaOption?: number;

  // Repeater
  repeaterShift?: string;
  repeaterOffset?: number;

  // CTCSS/DCS
  ctcssTone?: number;
  dcsCode?: string;
  ctcssSQL?: number;
  dcsSQL?: string;

  // Tuning/Memory
  tuningStep?: number;
  memory?: number;

  // Levels
  swr?: number;
  signalStrength?: number;
  alc?: number;
  afGain?: number;
  rfGain?: number;
  squelch?: number;
  micGain?: number;
  keySpeed?: number;
  voxGain?: number;
  antiVox?: number;
  compLevel?: number;
  agc?: string;
  attenuator?: number;
  preamp?: number;

  // Functions status
  noiseBlanker?: boolean;
  noiseReduction?: boolean;
  vox?: boolean;
  compressor?: boolean;
  monitor?: boolean;
  breakIn?: boolean;

  // Spectrum
  spectrumMode?: string;
  spectrumSpan?: number;
  spectrumEdgeLow?: number;
  spectrumEdgeHigh?: number;
  spectrumSpeed?: number;
  spectrumReference?: number;
  spectrumAveraging?: number;

  // Status
  dcd?: boolean;
  powerStatus?: number;
  transceive?: string;

  // Rig info
  rigModel?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  rigInfo?: string;
}

export interface RadioInfo {
  model: string;
  serialNumber: string;
  firmwareVersion: string;
}

export interface RadioCapabilities {
  levels: string[];
  funcs: string[];
  modes: string[];
  vfos: string[];
  supports: {
    setFrequency: boolean;
    setMode: boolean;
    setPower: boolean;
    setPTT: boolean;
    setVFO: boolean;
    setRIT: boolean;
    setXIT: boolean;
    setSplit: boolean;
    setAntenna: boolean;
    setCTCSS: boolean;
    setDCS: boolean;
    setTuningStep: boolean;
    setRepeater: boolean;
    setAGC: boolean;
    setNoiseBlanker: boolean;
    setNoiseReduction: boolean;
    setAttenuator: boolean;
    setPreamp: boolean;
    setSquelch: boolean;
    setRFGain: boolean;
    setAFGain: boolean;
    setMicGain: boolean;
    setKeySpeed: boolean;
    setVOX: boolean;
    setCompressor: boolean;
    setMonitor: boolean;
    setBreakIn: boolean;
    sendMorse: boolean;
    tune: boolean;
    scan: boolean;
    memoryOps: boolean;
    spectrum: boolean;
  };
  verifiedLevels?: Record<string, boolean>;
  verifiedFuncs?: Record<string, boolean>;
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
  bins: number[];
}

export interface SpectrumMeta {
  available?: boolean;
  device?: string;
  provider?: 'arecord' | 'ffmpeg';
  fps?: number;
}

export interface SpectrumState {
  settings: SpectrumSettings;
  frame: SpectrumFrame | null;
  connected: boolean;
  source: SpectrumSource;
  fullscreen: boolean;
  mode: SpectrumMode;
  meta?: SpectrumMeta;
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
  apiUrl: string;
  wsUrl: string;
  apiTimeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}
