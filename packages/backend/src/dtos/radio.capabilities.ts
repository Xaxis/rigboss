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
  };
  verifiedLevels?: Record<string, boolean>;
  verifiedFuncs?: Record<string, boolean>;
};

