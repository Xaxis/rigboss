import { z } from 'zod';

// Core radio state
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

// Radio capabilities
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

// Rigctl response
export interface RigctlResponse {
  result: string[];
  code: number | null;
}

// Spectrum frame
export interface SpectrumFrame {
  timestamp: number;
  startHz: number;
  binSizeHz: number;
  bins: number[];
}

// Command validation schemas
export const SetFrequencySchema = z.object({
  frequency: z.number().int().nonnegative(),
});

export const SetModeSchema = z.object({
  mode: z.string(),
  bandwidthHz: z.number().int().positive().optional(),
});

export const SetPowerSchema = z.object({
  power: z.number().min(0).max(100),
});

export const SetPTTSchema = z.object({
  ptt: z.boolean(),
});

export const TuneSchema = z.object({
  ms: z.number().int().min(100).max(5000).optional().default(1200),
});

export const ConnectSchema = z.object({
  host: z.string().ip().optional(),
  port: z.number().int().positive().optional(),
});

// Command types
export type SetFrequencyCommand = z.infer<typeof SetFrequencySchema>;
export type SetModeCommand = z.infer<typeof SetModeSchema>;
export type SetPowerCommand = z.infer<typeof SetPowerSchema>;
export type SetPTTCommand = z.infer<typeof SetPTTSchema>;
export type TuneCommand = z.infer<typeof TuneSchema>;
export type ConnectCommand = z.infer<typeof ConnectSchema>;

// Client metrics
export interface ClientMetrics {
  connected: boolean;
  reconnecting: boolean;
  queueSize: number;
  inflightCmd: string | null;
  inflightAgeMs: number | null;
  lastError: string | null;
  lastRprtAt: number | null;
  target: { host: string; port: number };
}
