import { BaseService } from './BaseService.js';
import type { 
  ISpectrumService, 
  SpectrumSettings, 
  SpectrumFrame,
  ServiceHealth, 
  ServiceCapabilities 
} from '../types/services.js';

export class SpectrumService extends BaseService implements ISpectrumService {
  private analyzing = false;
  private settings: SpectrumSettings;
  private config: any;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(config: any) {
    super('spectrum', '1.0.0', 'Spectrum analysis and waterfall generation');
    this.config = config;
    
    // Default settings
    this.settings = {
      centerHz: 14200000, // 20m band
      spanHz: 100000,     // 100 kHz
      fftSize: config.fftSize || 2048,
      averagingFactor: 0.5,
      refLevel: -40,
      colorMap: 'modern',
    };
  }

  protected async onStart(): Promise<void> {
    // Spectrum service is ready but doesn't auto-start analysis
    this.emitEvent('service_ready', { settings: this.settings });
  }

  protected async onStop(): Promise<void> {
    await this.stopAnalysis();
  }

  protected onGetHealth(): Partial<ServiceHealth> {
    return {
      status: this.analyzing ? 'healthy' : 'degraded',
      details: {
        analyzing: this.analyzing,
        fftSize: this.settings.fftSize,
        updateRate: this.config.updateRate || 30,
        centerHz: this.settings.centerHz,
        spanHz: this.settings.spanHz,
      },
    };
  }

  protected onGetCapabilities(): ServiceCapabilities {
    return {
      features: ['fft_analysis', 'waterfall_generation', 'real_time_streaming', 'configurable_settings'],
      version: this.version,
      endpoints: {
        http: ['/api/spectrum/start', '/api/spectrum/stop', '/api/spectrum/settings', '/api/spectrum/frame'],
        socket: ['/spectrum'],
      },
      dependencies: ['audio_service'],
    };
  }

  // ISpectrumService implementation
  async startAnalysis(): Promise<void> {
    if (this.analyzing) {
      return; // Already analyzing
    }

    try {
      this.analyzing = true;
      
      // Start periodic frame generation
      const updateRate = this.config.updateRate || 30; // FPS
      const interval = 1000 / updateRate;
      
      this.analysisInterval = setInterval(() => {
        this.generateFrame();
      }, interval);

      this.emitEvent('analysis_started', { 
        updateRate,
        settings: this.settings 
      });
    } catch (error) {
      this.analyzing = false;
      this.emitEvent('analysis_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async stopAnalysis(): Promise<void> {
    if (!this.analyzing) {
      return;
    }

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    this.analyzing = false;
    this.emitEvent('analysis_stopped', {});
  }

  isAnalyzing(): boolean {
    return this.analyzing;
  }

  async setSettings(settings: Partial<SpectrumSettings>): Promise<void> {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...settings };
    
    this.emitEvent('settings_changed', { 
      oldSettings, 
      newSettings: this.settings 
    });
  }

  getSettings(): SpectrumSettings {
    return { ...this.settings };
  }

  async getFrame(): Promise<SpectrumFrame> {
    // Generate a mock spectrum frame
    // In a real implementation, this would process actual audio data
    const bins = new Float32Array(512);
    
    // Generate mock spectrum data (noise + some peaks)
    for (let i = 0; i < bins.length; i++) {
      // Base noise floor
      bins[i] = -120 + Math.random() * 20;
      
      // Add some signal peaks
      if (i % 50 === 0) {
        bins[i] += 40 + Math.random() * 20;
      }
      if (i % 100 === 25) {
        bins[i] += 30 + Math.random() * 15;
      }
    }

    const frame: SpectrumFrame = {
      centerHz: this.settings.centerHz,
      spanHz: this.settings.spanHz,
      sampleRate: 48000, // Assuming 48kHz sample rate
      bins,
      timestamp: Date.now(),
    };

    return frame;
  }

  // Internal methods
  private async generateFrame(): Promise<void> {
    try {
      const frame = await this.getFrame();
      this.emitEvent('frame_generated', frame);
    } catch (error) {
      this.emitEvent('frame_generation_failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Additional utility methods
  setState(state: { centerHz?: number; spanHz?: number }): void {
    if (state.centerHz !== undefined) {
      this.settings.centerHz = state.centerHz;
    }
    if (state.spanHz !== undefined) {
      this.settings.spanHz = state.spanHz;
    }
    
    this.emitEvent('state_updated', { 
      centerHz: this.settings.centerHz,
      spanHz: this.settings.spanHz 
    });
  }

  getState(): { centerHz: number; spanHz: number } {
    return {
      centerHz: this.settings.centerHz,
      spanHz: this.settings.spanHz,
    };
  }

  // FFT processing methods (placeholder for real implementation)
  private processAudioSamples(samples: Float32Array, sampleRate: number): Float32Array {
    // This would contain real FFT processing
    // For now, return mock data
    const bins = new Float32Array(512);
    for (let i = 0; i < bins.length; i++) {
      bins[i] = -120 + Math.random() * 80;
    }
    return bins;
  }

  // Connect to audio service for real-time processing
  connectToAudioService(audioService: any): void {
    if (audioService && audioService.on) {
      audioService.on('event', (event: any) => {
        if (event.type === 'pcm_samples' && this.analyzing) {
          const processedBins = this.processAudioSamples(event.data.samples, event.data.sampleRate);
          const frame: SpectrumFrame = {
            centerHz: this.settings.centerHz,
            spanHz: this.settings.spanHz,
            sampleRate: event.data.sampleRate,
            bins: processedBins,
            timestamp: Date.now(),
          };
          this.emitEvent('frame_generated', frame);
        }
      });
    }
  }
}
