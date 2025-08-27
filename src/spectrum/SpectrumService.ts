import { io, Socket } from 'socket.io-client';
import { backendConfig } from '@/utils/backendConfig';

export type SpectrumFrame = {
  centerHz: number;
  spanHz: number;
  sampleRate: number;
  bins: Float32Array;
};

export type SpectrumState = {
  centerHz: number;
  spanHz: number;
  refLevel: number; // dBFS reference
  avg: number;      // 0..1 smoothing
  peakHold: boolean;
  colorMap: 'modern' | 'classic' | 'thermal';
};

export class SpectrumService {
  private socket: Socket | null = null;
  private listeners: Set<(frame: SpectrumFrame) => void> = new Set();
  private state: SpectrumState = {
    centerHz: 14200000,
    spanHz: 100_000,
    refLevel: -40,
    avg: 0.5,
    peakHold: true,
    colorMap: 'modern'
  };

  connect(): void {
    this.socket = io(backendConfig.spectrumUrl, { path: '/socket.io' });
    this.socket.on('spectrum-frame', (frame: { centerHz: number; spanHz: number; sampleRate: number; bins: number[] | Float32Array }) => {
      const bins = frame.bins instanceof Float32Array ? frame.bins : Float32Array.from(frame.bins);
      this.emit({ centerHz: frame.centerHz, spanHz: frame.spanHz, sampleRate: frame.sampleRate, bins });
    });
  }

  onFrame(cb: (frame: SpectrumFrame) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  emit(frame: SpectrumFrame): void {
    for (const cb of this.listeners) cb(frame);
  }

  getState(): SpectrumState { return this.state; }
  setState(partial: Partial<SpectrumState>): void { this.state = { ...this.state, ...partial }; }
}

