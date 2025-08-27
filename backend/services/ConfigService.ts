import { BaseService } from './BaseService.js';
import { validateConfig, defaultConfig, mergeConfig } from '../config/index.js';
import type { 
  IConfigService, 
  AppConfig, 
  ValidationResult,
  ServiceHealth, 
  ServiceCapabilities 
} from '../types/services.js';

export class ConfigService extends BaseService implements IConfigService {
  private currentConfig: AppConfig;

  constructor(initialConfig: AppConfig) {
    super('config', '1.0.0', 'Configuration management and validation');
    this.currentConfig = { ...initialConfig };
  }

  protected async onStart(): Promise<void> {
    // Validate current configuration on startup
    const validation = this.validateConfig(this.currentConfig);
    if (!validation.valid) {
      console.warn('Configuration validation warnings:', validation.errors);
    }
    
    this.emitEvent('service_ready', { 
      config: this.currentConfig,
      validation 
    });
  }

  protected async onStop(): Promise<void> {
    // Nothing special needed for config service shutdown
  }

  protected onGetHealth(): Partial<ServiceHealth> {
    const validation = this.validateConfig(this.currentConfig);
    
    return {
      status: validation.valid ? 'healthy' : 'degraded',
      details: {
        configValid: validation.valid,
        validationErrors: validation.errors,
        validationWarnings: validation.warnings,
        lastUpdated: Date.now(),
      },
    };
  }

  protected onGetCapabilities(): ServiceCapabilities {
    return {
      features: ['config_management', 'validation', 'hot_reload', 'backup_restore'],
      version: this.version,
      endpoints: {
        http: ['/api/config', '/api/config/validate', '/api/config/reset', '/api/config/backup'],
        socket: ['/config'],
      },
      dependencies: [],
    };
  }

  // IConfigService implementation
  async getConfig(): Promise<AppConfig> {
    return { ...this.currentConfig };
  }

  async updateConfig(configUpdate: Partial<AppConfig>): Promise<void> {
    // Merge with current config
    const newConfig = mergeConfig(this.currentConfig, configUpdate);
    
    // Validate the new configuration
    const validation = this.validateConfig(newConfig);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    const oldConfig = { ...this.currentConfig };
    this.currentConfig = newConfig;

    this.emitEvent('config_updated', { 
      oldConfig, 
      newConfig: this.currentConfig,
      validation 
    });
  }

  async resetConfig(): Promise<void> {
    const oldConfig = { ...this.currentConfig };
    this.currentConfig = { ...defaultConfig };

    this.emitEvent('config_reset', { 
      oldConfig, 
      newConfig: this.currentConfig 
    });
  }

  validateConfig(config: Partial<AppConfig>): ValidationResult {
    const result = validateConfig(config);
    
    // Add additional custom validations
    const errors = [...result.errors];
    const warnings: string[] = [];

    // Check for common configuration issues
    if (config.radio?.rigctldHost === 'localhost' && config.network?.allowRemoteConnections) {
      warnings.push('rigctld is set to localhost but remote connections are allowed - this may cause issues');
    }

    if (config.audio?.enabled && config.spectrum?.enabled && config.spectrum.updateRate && config.spectrum.updateRate > 30) {
      warnings.push('High spectrum update rate with audio enabled may cause performance issues');
    }

    if (config.radio?.pollInterval && config.radio.pollInterval < 500) {
      warnings.push('Very fast polling interval may overwhelm rigctld');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Additional utility methods
  getServiceConfig(serviceName: string): any {
    switch (serviceName) {
      case 'radio':
        return this.currentConfig.radio;
      case 'audio':
        return this.currentConfig.audio;
      case 'spectrum':
        return this.currentConfig.spectrum;
      case 'network':
        return this.currentConfig.network;
      default:
        return {};
    }
  }

  async updateServiceConfig(serviceName: string, serviceConfig: any): Promise<void> {
    const configUpdate: Partial<AppConfig> = {};
    
    switch (serviceName) {
      case 'radio':
        configUpdate.radio = { ...this.currentConfig.radio, ...serviceConfig };
        break;
      case 'audio':
        configUpdate.audio = { ...this.currentConfig.audio, ...serviceConfig };
        break;
      case 'spectrum':
        configUpdate.spectrum = { ...this.currentConfig.spectrum, ...serviceConfig };
        break;
      case 'network':
        configUpdate.network = { ...this.currentConfig.network, ...serviceConfig };
        break;
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }

    await this.updateConfig(configUpdate);
  }

  // Backup and restore functionality
  createBackup(): { config: AppConfig; timestamp: number; version: string } {
    return {
      config: { ...this.currentConfig },
      timestamp: Date.now(),
      version: this.version,
    };
  }

  async restoreFromBackup(backup: { config: AppConfig; timestamp: number; version: string }): Promise<void> {
    // Validate backup format
    if (!backup.config || !backup.timestamp) {
      throw new Error('Invalid backup format');
    }

    // Validate the backup configuration
    const validation = this.validateConfig(backup.config);
    if (!validation.valid) {
      throw new Error(`Backup configuration is invalid: ${validation.errors.join(', ')}`);
    }

    const oldConfig = { ...this.currentConfig };
    this.currentConfig = { ...backup.config };

    this.emitEvent('config_restored', { 
      oldConfig, 
      newConfig: this.currentConfig,
      backupTimestamp: backup.timestamp 
    });
  }

  // Environment variable integration
  applyEnvironmentOverrides(): void {
    const envOverrides: Partial<AppConfig> = {};

    // Radio overrides
    if (process.env.RIGCTLD_HOST) {
      envOverrides.radio = { 
        ...this.currentConfig.radio, 
        rigctldHost: process.env.RIGCTLD_HOST 
      };
    }
    if (process.env.RIGCTLD_PORT) {
      envOverrides.radio = { 
        ...envOverrides.radio || this.currentConfig.radio, 
        rigctldPort: parseInt(process.env.RIGCTLD_PORT) 
      };
    }

    // Network overrides
    if (process.env.BACKEND_PORT) {
      envOverrides.network = { 
        ...this.currentConfig.network, 
        serverPort: parseInt(process.env.BACKEND_PORT) 
      };
    }

    if (Object.keys(envOverrides).length > 0) {
      this.currentConfig = mergeConfig(this.currentConfig, envOverrides);
      this.emitEvent('environment_overrides_applied', { overrides: envOverrides });
    }
  }
}
