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
    if (!this.audioContext || !this.remoteAudioEl) return;

    try {
      // Convert raw PCM to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);

      // Create a source and play it
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (e) {
      // Raw PCM data - need to create AudioBuffer manually
      const samples = new Int16Array(audioData);
      const audioBuffer = this.audioContext.createBuffer(1, samples.length, 48000);
      const channelData = audioBuffer.getChannelData(0);

      // Convert Int16 to Float32
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = samples[i] / 32768.0;
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start();
    }
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

  private startMicTransmission(): void {
    if (!this.micStream || !this.audioContext) return;

    const source = this.audioContext.createMediaStreamSource(this.micStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (e) => {
      if (!this.isTransmitting) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Convert Float32 to Int16
      const samples = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        samples[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }

      this.socket?.emit('mic-data', samples.buffer);
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  private stopMicTransmission(): void {
    // Mic transmission stops automatically when isTransmitting = false
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

