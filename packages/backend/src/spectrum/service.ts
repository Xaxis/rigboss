import { EventEmitter } from 'node:events';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import ffmpegPath from 'ffmpeg-static';
import FFT from 'fft.js';
import { EVENTS } from '../events.js';
import type { RadioStateEvent } from '../events.js';

export type SpectrumSource = 'AUTO' | 'IF' | 'IQ' | 'PCM';

export interface SpectrumSettings {
  centerHz: number;
  spanHz: number;
  fftSize: 1024 | 2048 | 4096;
  averaging: number; // 0 = off, N = exponential smoothing factor
  fps: number; // 15..30
  refLevel: number; // dB ref for rendering
  source: SpectrumSource;
  coupled: boolean; // couple center to radio
}

export interface SpectrumFrame {
  timestamp: number;
  startHz: number;
  binSizeHz: number;
  bins: number[]; // dB values per bin
}


interface SpectrumConfig {
  sampleRate?: number; // Hz
  device?: string; // ALSA device, e.g., 'default' or 'hw:1,0'
}

function listAlsaCards(): Array<{ index: number; name: string }> {
  try {
    const txt = fs.readFileSync('/proc/asound/cards', 'utf8');
    const lines = txt.split('\n');
    const out: Array<{ index: number; name: string }> = [];
    for (const line of lines) {
      const m = line.match(/^\s*(\d+)\s*\[([^\]]+)\]/);
      if (m && m[1] && m[2]) {
        const idx = Number(m[1]);
        const name = String(m[2] || '').trim();
        out.push({ index: idx, name });
      }
    }
    return out;
  } catch {
    return [];
  }
}



// Simple Hann window
function hannWindow(N: number): Float32Array {
  const w = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
  }
  return w;
}

export class SpectrumService extends EventEmitter {
  private cfg: Required<SpectrumConfig>;
  private settings: SpectrumSettings;
  private proc: ChildProcessWithoutNullStreams | null = null;
  private pcmBuffer: Buffer = Buffer.alloc(0);
  private timer: NodeJS.Timeout | null = null;
  private hannWin: Float32Array;
  private fft: any;
  private out: Float32Array;
  private imag: Float32Array;
  private lastBins: Float32Array | null = null;

  constructor(cfg: SpectrumConfig | undefined, onRadioState?: (evt: RadioStateEvent) => void) {
    super();
    this.cfg = {
      sampleRate: cfg?.sampleRate ?? 48000,
      device: cfg?.device ?? 'default',
    };

    this.settings = {
      centerHz: 14200000,
      spanHz: 100000,
      fftSize: 2048,
      averaging: 3,
      fps: 20,
      refLevel: 0,
      source: 'AUTO',
      coupled: true,
    };

    this.fft = new FFT(this.settings.fftSize);
    this.hannWin = hannWindow(this.settings.fftSize);
    this.out = this.fft.createComplexArray();
    this.imag = this.fft.createComplexArray();

    if (onRadioState) {
      // Couple centerHz to radio frequency when enabled
      this.on('couple-radio', onRadioState);
    }
  }

  getSettings(): SpectrumSettings {
    return { ...this.settings };
  }

  private buildDeviceCandidates(): string[] {
    const candidates: string[] = [];
    const configured = this.cfg.device;
    if (configured && configured !== 'AUTO') candidates.push(configured);
    if (process.platform === 'linux') {
      const cards = listAlsaCards();
      for (const c of cards) {
        candidates.push(`hw:CARD=${c.name},DEV=0`);
        candidates.push(`plughw:CARD=${c.name},DEV=0`);
        candidates.push(`hw:${c.index},0`);
        candidates.push(`hw:${c.index}`);
        candidates.push(`plughw:${c.index},0`);
        candidates.push(`plughw:${c.index}`);
        candidates.push(`sysdefault:CARD=${c.name}`);
      }
      candidates.push('default');
    } else if (process.platform === 'darwin') {
      candidates.push(':0');
    }
    return Array.from(new Set(candidates));
  }

  private async tryStartForDevice(device: string): Promise<boolean> {
    const bin = (ffmpegPath as unknown as string) || 'ffmpeg';
    const inputFmt = process.platform === 'linux' ? ['-f', 'alsa', '-i', device] : ['-f', 'avfoundation', '-i', ':0'];
    const args = [
      ...inputFmt,
      '-ac', '1',
      '-ar', String(this.cfg.sampleRate),
      '-acodec', 'pcm_s16le',
      '-f', 's16le',
      'pipe:1',
    ];

    console.log('[Spectrum] ffmpeg args:', args.join(' '));
    const proc = spawn(bin, args);

    let gotData = false;
    const onData = (chunk: Buffer) => {
      gotData = true;
      this.pcmBuffer = Buffer.concat([this.pcmBuffer, chunk]);
    };

    proc.stdout.on('data', onData);

    let stderrLines = 0;
    proc.stderr.on('data', (buf: Buffer) => {
      if (stderrLines < 5) {
        console.log('[Spectrum][ffmpeg]', buf.toString().trim());
        stderrLines++;
      }
    });

    const success = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(gotData), 1200);
      proc.once('close', () => resolve(false));
      // If data arrives within 1.2s, we consider device opened
    });

    if (!success) {
      try { proc.kill('SIGTERM'); } catch {}
      return false;
    }

    // Success: adopt this process
    this.proc = proc as ChildProcessWithoutNullStreams;
    proc.stdout.off('data', onData);

    this.proc.stdout.on('data', (chunk: Buffer) => {
      this.pcmBuffer = Buffer.concat([this.pcmBuffer, chunk]);
    });

    this.proc.on('error', (err) => {
      this.emit(EVENTS.SPECTRUM_SETTINGS, { settings: this.getSettings(), available: false, error: String(err) });
    });

    this.proc.on('close', () => {
      this.proc = null;
      this.setUnavailable();
    });

    return true;
  }

  applySettings(patch: Partial<SpectrumSettings>): SpectrumSettings {
    const before = this.settings;
    this.settings = { ...before, ...patch } as SpectrumSettings;

    // Reinit FFT/window if fftSize changed
    if (patch.fftSize && patch.fftSize !== before.fftSize) {
      this.fft = new FFT(this.settings.fftSize);
      this.hannWin = hannWindow(this.settings.fftSize);
      this.out = this.fft.createComplexArray();
      this.imag = this.fft.createComplexArray();
    }

    this.emit(EVENTS.SPECTRUM_SETTINGS, { settings: this.getSettings() });
    return this.getSettings();
  }

  async start(): Promise<void> {
    if (this.proc) return;

    const devices = this.buildDeviceCandidates();
    let started = false;
    for (const dev of devices) {
      this.pcmBuffer = Buffer.alloc(0);
      const ok = await this.tryStartForDevice(dev);
      if (ok) {
        console.log('[Spectrum] capture device selected:', dev);
        started = true;
        break;
      }
    }

    if (!started) {
      this.setUnavailable();
      return;
    }

    // Frame loop
    const interval = Math.max(15, Math.min(60, this.settings.fps));
    this.timer = setInterval(() => {
      try {
        this.produceFrame();
      } catch {
        // ignore transient errors
      }
    }, Math.round(1000 / interval));

    // Announce settings
    this.emit(EVENTS.SPECTRUM_SETTINGS, { settings: this.getSettings() });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.proc) {
      try { this.proc.kill('SIGTERM'); } catch {}
      this.proc = null;
    }
    this.setUnavailable();
  }

  private setUnavailable() {
    this.emit(EVENTS.SPECTRUM_SETTINGS, { settings: { ...this.getSettings() }, available: false });
  }

  // Consume last fftSize samples, compute FFT, emit bins
  private produceFrame(): void {
    const bytesPerSample = 2; // s16le
    const needBytes = this.settings.fftSize * bytesPerSample;
    if (this.pcmBuffer.length < needBytes) return;

    const slice = this.pcmBuffer.subarray(this.pcmBuffer.length - needBytes);
    // Keep buffer from growing unbounded
    this.pcmBuffer = this.pcmBuffer.subarray(Math.max(0, this.pcmBuffer.length - needBytes * 4));

    // Convert to Float32 and apply window
    const N = this.settings.fftSize;
    const real = new Float32Array(N);
    const win = this.hannWin;
    for (let i = 0; i < N; i++) {
      const s = slice.readInt16LE(i * 2);
      const v = s / 32768;
      const w = win[i] ?? 0;
      real[i] = v * w;
    }

    // FFT (real)
    // fft.js uses complex arrays; realTransform populates complex output
    const complex = this.fft.createComplexArray();
    this.fft.realTransform(complex, real);
    this.fft.completeSpectrum(complex);

    // Magnitude to dB for first N/2 bins
    const half = N / 2;
    const bins = new Float32Array(half);
    for (let k = 0; k < half; k++) {
      const re = complex[2 * k];
      const im = complex[2 * k + 1];
      const mag = Math.sqrt(re * re + im * im) + 1e-12;
      const db = 20 * Math.log10(mag);
      bins[k] = db;
    }

    // Averaging (simple exponential smoothing)
    if (this.settings.averaging > 0) {
      const alpha = Math.min(0.9, Math.max(0.05, this.settings.averaging / 10));
      if (!this.lastBins || this.lastBins.length !== bins.length) {
        this.lastBins = new Float32Array(bins);
      } else {
        const prev = this.lastBins as Float32Array;
        for (let i = 0; i < bins.length; i++) {
          const bi = (bins[i] ?? 0) as number;
          const pv = (prev[i] ?? 0) as number;
          prev[i] = alpha * bi + (1 - alpha) * pv;
        }
        this.lastBins = prev;
      }
    } else {
      this.lastBins = null;
    }

    const dbBins = (this.lastBins ?? bins).slice();

    // Map to RF: bins array corresponds to spanHz across width
    const startHz = this.settings.centerHz - this.settings.spanHz / 2;
    const binSizeHz = this.settings.spanHz / dbBins.length;

    const frame: SpectrumFrame = {
      timestamp: Date.now(),
      startHz,
      binSizeHz,
      bins: Array.from(dbBins),
    };

    this.emit(EVENTS.SPECTRUM_FRAME, frame);
  }
}

