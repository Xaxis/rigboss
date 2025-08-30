export interface AudioConfig {
  enabled: boolean;
  sampleRate: number;
  bufferSize: number;
  inputDevice?: string;
  outputDevice?: string;
}

export interface AudioLevel {
  input: number;  // 0-1 range
  output: number; // 0-1 range
}

export interface AudioStream {
  id: string;
  type: 'input' | 'output';
  active: boolean;
  level: number;
}

export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
  channels: number;
  sampleRate: number;
  isDefault: boolean;
}
