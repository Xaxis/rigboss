// Core service types and interfaces

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastCheck: number;
  details?: Record<string, any>;
}

export interface ServiceCapabilities {
  features: string[];
  version: string;
  endpoints: {
    http: string[];
    socket: string[];
  };
  dependencies: string[];
}

export interface ServiceMetadata {
  name: string;
  version: string;
  description: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  health: ServiceHealth;
  capabilities: ServiceCapabilities;
}

// Base service interface
export interface IService {
  readonly name: string;
  readonly version: string;
  readonly status: ServiceStatus;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): ServiceHealth;
  getCapabilities(): ServiceCapabilities;
  getMetadata(): ServiceMetadata;
}

export type ServiceStatus = 'starting' | 'running' | 'stopped' | 'error';

// Standardized API response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  service: string;
  version: string;
}

// Standardized socket event
export interface SocketEvent<T = any> {
  type: string;
  data: T;
  timestamp: number;
  service: string;
  version: string;
}

// Service-specific interfaces

export interface IRadioService extends IService {
  connect(host: string, port: number): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  getState(): Promise<RadioState>;
  setFrequency(frequency: number): Promise<void>;
  setMode(mode: string, bandwidth?: number): Promise<void>;
  setPower(power: number): Promise<void>;
  setPTT(enabled: boolean): Promise<void>;
  
  startPolling(interval: number): void;
  stopPolling(): void;
}

export interface IAudioService extends IService {
  isAvailable(): boolean;
  
  startStreaming(): Promise<void>;
  stopStreaming(): Promise<void>;
  isStreaming(): boolean;
  
  setAudioLevel(level: string, value: number): Promise<void>;
  getAudioLevels(): Promise<Record<string, number>>;
  
  setTxEnabled(enabled: boolean): void;
}

export interface ISpectrumService extends IService {
  startAnalysis(): Promise<void>;
  stopAnalysis(): Promise<void>;
  isAnalyzing(): boolean;
  
  setSettings(settings: SpectrumSettings): Promise<void>;
  getSettings(): SpectrumSettings;
  
  getFrame(): Promise<SpectrumFrame>;
}

export interface IConfigService extends IService {
  getConfig(): Promise<AppConfig>;
  updateConfig(config: Partial<AppConfig>): Promise<void>;
  resetConfig(): Promise<void>;
  
  validateConfig(config: Partial<AppConfig>): ValidationResult;
}

// Service-specific types
export interface RadioState {
  frequency: number;
  mode: string;
  bandwidth: number;
  power: number;
  ptt: boolean;
  connected: boolean;
  model?: string;
  squelch?: number;
  volume?: number;
  antenna?: number;
}

export interface SpectrumSettings {
  centerHz: number;
  spanHz: number;
  fftSize: number;
  averagingFactor: number;
  refLevel: number;
  colorMap: string;
}

export interface SpectrumFrame {
  centerHz: number;
  spanHz: number;
  sampleRate: number;
  bins: Float32Array;
  timestamp: number;
}

export interface AppConfig {
  radio: {
    rigctldHost: string;
    rigctldPort: number;
    pollInterval: number;
    commandTimeout: number;
  };
  audio: {
    enabled: boolean;
    sampleRate: number;
    bufferSize: number;
  };
  spectrum: {
    enabled: boolean;
    fftSize: number;
    updateRate: number;
  };
  network: {
    serverHost: string;
    serverPort: number;
    allowRemoteConnections: boolean;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Service registry types
export interface ServiceRegistryEntry {
  service: IService;
  metadata: ServiceMetadata;
  registeredAt: number;
}

export interface ServiceRegistry {
  register(service: IService): void;
  unregister(serviceName: string): void;
  get(serviceName: string): IService | undefined;
  getAll(): ServiceRegistryEntry[];
  getMetadata(serviceName: string): ServiceMetadata | undefined;
  getAllMetadata(): ServiceMetadata[];
}
