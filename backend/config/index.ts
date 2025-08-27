import type { AppConfig } from '../types/services.js';

// Default configuration
export const defaultConfig: AppConfig = {
  radio: {
    rigctldHost: process.env.RIGCTLD_HOST || 'localhost',
    rigctldPort: parseInt(process.env.RIGCTLD_PORT || '4532'),
    pollInterval: parseInt(process.env.POLL_INTERVAL || '1000'),
    commandTimeout: 3000,
  },
  audio: {
    enabled: true,
    sampleRate: 48000,
    bufferSize: 1024,
  },
  spectrum: {
    enabled: true,
    fftSize: 2048,
    updateRate: 30,
  },
  network: {
    serverHost: '',
    serverPort: parseInt(process.env.BACKEND_PORT || '3001'),
    allowRemoteConnections: true,
  },
};

// Configuration validation
export function validateConfig(config: Partial<AppConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.radio) {
    if (config.radio.rigctldPort && (config.radio.rigctldPort < 1 || config.radio.rigctldPort > 65535)) {
      errors.push('rigctldPort must be between 1 and 65535');
    }
    if (config.radio.pollInterval && config.radio.pollInterval < 100) {
      errors.push('pollInterval must be at least 100ms');
    }
    if (config.radio.commandTimeout && config.radio.commandTimeout < 1000) {
      errors.push('commandTimeout must be at least 1000ms');
    }
  }

  if (config.audio) {
    if (config.audio.sampleRate && ![8000, 16000, 22050, 44100, 48000].includes(config.audio.sampleRate)) {
      errors.push('sampleRate must be one of: 8000, 16000, 22050, 44100, 48000');
    }
    if (config.audio.bufferSize && (config.audio.bufferSize < 256 || config.audio.bufferSize > 8192)) {
      errors.push('bufferSize must be between 256 and 8192');
    }
  }

  if (config.spectrum) {
    if (config.spectrum.fftSize && ![512, 1024, 2048, 4096, 8192].includes(config.spectrum.fftSize)) {
      errors.push('fftSize must be one of: 512, 1024, 2048, 4096, 8192');
    }
    if (config.spectrum.updateRate && (config.spectrum.updateRate < 1 || config.spectrum.updateRate > 60)) {
      errors.push('updateRate must be between 1 and 60 FPS');
    }
  }

  if (config.network) {
    if (config.network.serverPort && (config.network.serverPort < 1 || config.network.serverPort > 65535)) {
      errors.push('serverPort must be between 1 and 65535');
    }
  }

  return { valid: errors.length === 0, errors };
}

// Environment-based configuration loading
export function loadConfig(): AppConfig {
  const config = { ...defaultConfig };

  // Override with environment variables
  if (process.env.RIGCTLD_HOST) {
    config.radio.rigctldHost = process.env.RIGCTLD_HOST;
  }
  if (process.env.RIGCTLD_PORT) {
    config.radio.rigctldPort = parseInt(process.env.RIGCTLD_PORT);
  }
  if (process.env.POLL_INTERVAL) {
    config.radio.pollInterval = parseInt(process.env.POLL_INTERVAL);
  }
  if (process.env.BACKEND_PORT) {
    config.network.serverPort = parseInt(process.env.BACKEND_PORT);
  }

  // Validate the loaded configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.warn('Configuration validation warnings:', validation.errors);
  }

  return config;
}

// Configuration utilities
export function mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
  return {
    radio: { ...base.radio, ...override.radio },
    audio: { ...base.audio, ...override.audio },
    spectrum: { ...base.spectrum, ...override.spectrum },
    network: { ...base.network, ...override.network },
  };
}

export function getServiceConfig(config: AppConfig, serviceName: string): any {
  switch (serviceName) {
    case 'radio':
      return config.radio;
    case 'audio':
      return config.audio;
    case 'spectrum':
      return config.spectrum;
    case 'network':
      return config.network;
    default:
      return {};
  }
}
