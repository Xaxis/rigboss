import { io, Socket } from 'socket.io-client';

export type AudioEngineEvents = {
  onAvailable?: (available: boolean) => void;
  onConnected?: () => void;
  onError?: (message: string) => void;
};

// Cross-platform audio engine using WebSocket + raw audio
export class AudioEngine {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private remoteAudioEl: HTMLAudioElement | null = null;
  private events: AudioEngineEvents;
  private micStream: MediaStream | null = null;
  private isTransmitting = false;
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;

  constructor(events: AudioEngineEvents = {}) {
    this.events = events;
  }

  attachOutputElement(el: HTMLAudioElement) {
    this.remoteAudioEl = el;
  }

  async start(): Promise<void> {
    // Auto-detect backend URL like the main socket service
    const currentHost = window.location.hostname;
    let backendUrl: string;
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      backendUrl = 'http://localhost:3001/audio';
    } else {
      backendUrl = `http://${currentHost}:3001/audio`;
    }

    this.socket = io(backendUrl, { path: '/socket.io' });

    await new Promise<void>((resolve, reject) => {
      this.socket!.on('connect', () => resolve());
      this.socket!.on('connect_error', reject);
    });

    this.socket.on('server-capabilities', (cap: { available: boolean }) => {
      this.events.onAvailable?.(cap.available);
      if (cap.available) {
        this.socket?.emit('start-audio');
      }
    });

    this.socket.on('audio-started', () => {
      this.events.onConnected?.();
    });

    this.socket.on('audio-data', (audioData: ArrayBuffer) => {
      this.playAudioData(audioData);
    });

    this.socket.on('audio-error', (e: { message: string }) => {
      this.events.onError?.(e.message);
    });

    // Initialize audio context for playback
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  private async playAudioData(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) return;

    try {
      // Raw PCM data from backend (s16le format)
      const samples = new Int16Array(audioData);

      if (samples.length === 0) return;

      // Convert Int16 to Float32 and add to queue
      const floatSamples = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        floatSamples[i] = samples[i] / 32768.0;
      }

      this.audioQueue.push(floatSamples);

      // Start continuous playback if not already playing
      if (!this.isPlaying) {
        this.startContinuousPlayback();
      }

    } catch (error) {
      console.warn('Audio playback error:', error);
    }
  }

  private startContinuousPlayback(): void {
    if (!this.audioContext || this.isPlaying) return;

    this.isPlaying = true;
    const bufferSize = 4096;
    const processor = this.audioContext.createScriptProcessor(bufferSize, 0, 1);

    processor.onaudioprocess = (e) => {
      const outputData = e.outputBuffer.getChannelData(0);

      // Fill output buffer from queue
      let samplesWritten = 0;
      while (samplesWritten < outputData.length && this.audioQueue.length > 0) {
        const chunk = this.audioQueue[0];
        const samplesToWrite = Math.min(chunk.length, outputData.length - samplesWritten);

        for (let i = 0; i < samplesToWrite; i++) {
          outputData[samplesWritten + i] = chunk[i];
        }

        samplesWritten += samplesToWrite;

        if (samplesToWrite === chunk.length) {
          this.audioQueue.shift(); // Remove fully consumed chunk
        } else {
          // Partial consumption - keep remaining samples
          this.audioQueue[0] = chunk.slice(samplesToWrite);
        }
      }

      // Fill remaining with silence if no more data
      for (let i = samplesWritten; i < outputData.length; i++) {
        outputData[i] = 0;
      }
    };

    processor.connect(this.audioContext.destination);

    // Stop playback when queue is empty for a while
    const checkEmpty = () => {
      if (this.audioQueue.length === 0) {
        setTimeout(() => {
          if (this.audioQueue.length === 0) {
            processor.disconnect();
            this.isPlaying = false;
          } else {
            checkEmpty();
          }
        }, 1000);
      } else {
        setTimeout(checkEmpty, 100);
      }
    };

    setTimeout(checkEmpty, 1000);
  }

  async startMicCapture(deviceId?: string): Promise<void> {
    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId ? { exact: deviceId } : undefined }
      });
    } catch (e) {
      this.events.onError?.('Failed to access microphone');
    }
  }

  async setPTT(enabled: boolean): Promise<void> {
    this.isTransmitting = enabled;

    if (enabled && this.micStream) {
      // Start sending mic data
      this.startMicTransmission();
    } else {
      // Stop sending mic data
      this.stopMicTransmission();
    }
  }

  private micProcessor: ScriptProcessorNode | null = null;

  private startMicTransmission(): void {
    if (!this.micStream || !this.audioContext || this.micProcessor) return;

    const source = this.audioContext.createMediaStreamSource(this.micStream);
    this.micProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.micProcessor.onaudioprocess = (e) => {
      if (!this.isTransmitting) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Convert Float32 to Int16 (s16le format)
      const samples = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }

      this.socket?.emit('mic-data', samples.buffer);
    };

    source.connect(this.micProcessor);
    this.micProcessor.connect(this.audioContext.destination);
  }

  private stopMicTransmission(): void {
    if (this.micProcessor) {
      this.micProcessor.disconnect();
      this.micProcessor = null;
    }
  }

  async stop(): Promise<void> {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }

    if (this.socket?.connected) {
      this.socket.emit('stop-audio');
      this.socket.disconnect();
    }
    this.socket = null;

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  async setOutputDevice(deviceId: string | null) {
    if (!this.remoteAudioEl) return;
    // @ts-ignore - setSinkId is not in lib.dom.d.ts everywhere
    if (typeof this.remoteAudioEl.setSinkId === 'function') {
      try { await (this.remoteAudioEl as any).setSinkId(deviceId || 'default'); } catch {}
    }
  }
}

