export type RadioState = {
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

  // Tuning step
  tuningStep?: number;

  // Memory
  memory?: number;

  // Levels - comprehensive coverage
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

  // Status
  dcd?: boolean;
  powerStatus?: number;
  transceive?: string;

  // Rig info
  rigModel?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  rigInfo?: string;
};

export type RadioCapabilities = {
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
  };
  verifiedLevels?: Record<string, boolean>;
  verifiedFuncs?: Record<string, boolean>;
};

export type RigctlResponse = {
  result: string[];
  code: number | null;
};
