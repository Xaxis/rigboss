import { EventEmitter } from 'node:events';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import type { AudioConfig, AudioLevel, AudioDevice } from './types.js';
import { EVENTS } from '../events.js';

export class AudioService extends EventEmitter {
  private config: AudioConfig;
  private inputLevel = 0;
  private outputLevel = 0;
  private active = false;
  private levelTimer: NodeJS.Timeout | null = null;

  // Audio streaming processes
  private rxAudioProc: ChildProcessWithoutNullStreams | null = null;
  private txAudioProc: ChildProcessWithoutNullStreams | null = null;
  private rxAudioBuffer = Buffer.alloc(0);
  private txAudioBuffer = Buffer.alloc(0);

  // Audio devices
  private availableDevices: AudioDevice[] = [];
  private selectedInputDevice: string | null = null;
  private selectedOutputDevice: string | null = null;

  constructor(config: AudioConfig) {
    super();
    this.config = config;
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('🔇 Audio disabled in configuration');
      return;
    }

    try {
      // Discover audio devices
      await this.discoverAudioDevices();

      // Start RX audio capture (radio → computer speakers)
      await this.startRXAudio();

      this.active = true;
      this.startLevelMonitoring();
      console.log('🔊 Audio service started');

      this.emit(EVENTS.AUDIO_STARTED, {
        devices: this.availableDevices,
        rxDevice: this.selectedOutputDevice,
        txDevice: this.selectedInputDevice
      });
    } catch (error) {
      console.error('Audio service start error:', error);
      this.emit(EVENTS.AUDIO_ERROR, { error: 'Failed to start audio' });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.stopRXAudio();
    this.stopTXAudio();
    this.stopLevelMonitoring();
    this.active = false;
    console.log('🔇 Audio service stopped');
    this.emit(EVENTS.AUDIO_STOPPED);
  }

  isActive(): boolean {
    return this.active;
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async getDevices(): Promise<AudioDevice[]> {
    return this.availableDevices;
  }

  setInputLevel(level: number): void {
    this.inputLevel = Math.max(0, Math.min(1, level));
  }

  setOutputLevel(level: number): void {
    this.outputLevel = Math.max(0, Math.min(1, level));
  }

  async startTXAudio(inputDeviceId?: string): Promise<void> {
    if (this.txAudioProc) {
      this.stopTXAudio();
    }

    const device = inputDeviceId || this.selectedInputDevice || 'default';
    console.log(`🎤 Starting TX audio capture from: ${device}`);

    try {
      const bin = (ffmpegPath as unknown as string) || 'ffmpeg';
      const inputFmt = process.platform === 'linux' ? ['-f', 'alsa', '-i', device] : ['-f', 'avfoundation', '-i', ':0'];
      const args = [
        ...inputFmt,
        '-ac', '1',  // Mono for TX
        '-ar', String(this.config.sampleRate),
        '-acodec', 'pcm_s16le',
        '-f', 's16le',
        'pipe:1',
      ];

      this.txAudioProc = spawn(bin, args);

      this.txAudioProc.stdout.on('data', (chunk: Buffer) => {
        this.txAudioBuffer = Buffer.concat([this.txAudioBuffer, chunk]);
        // Emit TX audio data for transmission to radio
        this.emit(EVENTS.AUDIO_TX_DATA, { data: chunk });
      });

      this.txAudioProc.on('error', (err) => {
        console.error('TX audio error:', err);
        this.emit(EVENTS.AUDIO_ERROR, { error: 'TX audio failed' });
      });

      this.selectedInputDevice = device;
      console.log('🎤 TX audio started successfully');
    } catch (error) {
      console.error('Failed to start TX audio:', error);
      throw error;
    }
  }

  stopTXAudio(): void {
    if (this.txAudioProc) {
      try {
        this.txAudioProc.kill('SIGTERM');
      } catch {}
      this.txAudioProc = null;
      console.log('🎤 TX audio stopped');
    }
  }

  private async discoverAudioDevices(): Promise<void> {
    console.log('🔍 Discovering audio devices...');

    // Use the same devices that work for spectrum
    const workingDevices = [
      { id: 'sysdefault:CARD=CODEC', name: 'Radio Audio (CODEC)', type: 'both' },
      { id: 'default', name: 'System Default', type: 'both' },
    ];

    this.availableDevices = [];

    for (const device of workingDevices) {
      // Add input device
      this.availableDevices.push({
        id: device.id,
        name: `${device.name} (Input)`,
        type: 'input',
        channels: 1,
        sampleRate: this.config.sampleRate,
        isDefault: device.id === 'default',
      });

      // Add output device
      this.availableDevices.push({
        id: device.id,
        name: `${device.name} (Output)`,
        type: 'output',
        channels: 2,
        sampleRate: this.config.sampleRate,
        isDefault: device.id === 'default',
      });
    }

    // Set default devices
    const defaultOutput = this.availableDevices.find(d => d.type === 'output' && d.isDefault);
    const defaultInput = this.availableDevices.find(d => d.type === 'input' && d.isDefault);

    this.selectedOutputDevice = defaultOutput?.id || null;
    this.selectedInputDevice = defaultInput?.id || null;

    console.log(`🔍 Found ${this.availableDevices.length} audio devices`);
  }

  private async startRXAudio(): Promise<void> {
    // Use the EXACT SAME approach as spectrum analyzer!
    const audioDevice = 'sysdefault:CARD=CODEC';

    console.log(`🔊 Starting RX audio from: ${audioDevice}`);

    try {
      // Use arecord (same as spectrum) instead of ffmpeg
      const args = [
        '-D', audioDevice,
        '-f', 'S16_LE',
        '-r', String(this.config.sampleRate),
        '-c', '1',  // Mono
        '-q',       // Quiet
        '-t', 'raw',
        '-'         // Output to stdout
      ];

      console.log('🔊 Audio capture args (arecord):', args.join(' '));
      this.rxAudioProc = spawn('arecord', args);

      this.rxAudioProc.stdout.on('data', (chunk: Buffer) => {
        this.rxAudioBuffer = Buffer.concat([this.rxAudioBuffer, chunk]);
        // Emit RX audio data for streaming to frontend
        this.emit(EVENTS.AUDIO_RX_DATA, { data: chunk });
      });

      this.rxAudioProc.stderr.on('data', (data) => {
        console.log('🔊 Audio stderr:', data.toString());
      });

      this.rxAudioProc.on('error', (err) => {
        console.error('🔊 RX audio process error:', err);
        this.emit(EVENTS.AUDIO_ERROR, { error: 'RX audio failed' });
      });

      this.rxAudioProc.on('close', (code) => {
        console.log(`🔊 RX audio process closed with code: ${code}`);
        this.rxAudioProc = null;
      });

      console.log('🔊 RX audio process started successfully');
    } catch (error) {
      console.error('🔊 Failed to start RX audio:', error);
      throw error;
    }
  }

  private stopRXAudio(): void {
    if (this.rxAudioProc) {
      try {
        this.rxAudioProc.kill('SIGTERM');
      } catch {}
      this.rxAudioProc = null;
      console.log('🔊 RX audio stopped');
    }
  }

  private startLevelMonitoring(): void {
    if (this.levelTimer) return;

    this.levelTimer = setInterval(() => {
      // Calculate actual audio levels from buffers
      let inputLevel = 0;
      let outputLevel = 0;

      if (this.txAudioBuffer.length > 0) {
        inputLevel = this.calculateAudioLevel(this.txAudioBuffer);
        this.txAudioBuffer = Buffer.alloc(0); // Clear buffer
      }

      if (this.rxAudioBuffer.length > 0) {
        outputLevel = this.calculateAudioLevel(this.rxAudioBuffer);
        this.rxAudioBuffer = Buffer.alloc(0); // Clear buffer
      }

      this.emit(EVENTS.AUDIO_LEVEL, {
        input: inputLevel,
        output: outputLevel,
      } as AudioLevel);
    }, 50); // 20 FPS for smooth level meters
  }

  private calculateAudioLevel(buffer: Buffer): number {
    if (buffer.length < 2) return 0;

    let sum = 0;
    const samples = buffer.length / 2; // 16-bit samples

    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      sum += Math.abs(sample);
    }

    const average = sum / samples;
    const normalized = average / 32768; // Normalize to 0-1
    return Math.min(1, normalized);
  }

  private stopLevelMonitoring(): void {
    if (this.levelTimer) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
  }
}
