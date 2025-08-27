// Real FFT-based PCM ingestor that converts live PCM samples into spectrum bins.
// Uses a radix-2 FFT (Hann window) to produce N/2 magnitude bins in dBFS.

import { SpectrumService } from '@/spectrum/SpectrumService';

const FFT_SIZE = 4096; // power of 2
const BINS = 1024;     // draw resolution (decimate magnitudes)

function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}
const HANN = hannWindow(FFT_SIZE);

function bitReverseIndices(n: number): Uint32Array {
  const bits = Math.log2(n) | 0;
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let x = i, r = 0;
    for (let j = 0; j < bits; j++) { r = (r << 1) | (x & 1); x >>= 1; }
    rev[i] = r >>> 0;
  }
  return rev;
}
const BITREV = bitReverseIndices(FFT_SIZE);

function fftRadix2(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  // bit-reversal permutation
  for (let i = 0; i < n; i++) {
    const j = BITREV[i];
    if (j > i) { const tr = real[i]; const ti = imag[i]; real[i] = real[j]; imag[i] = imag[j]; real[j] = tr; imag[j] = ti; }
  }
  // Cooley–Tukey
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = (2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const angle = step * k;
        const wr = Math.cos(angle), wi = -Math.sin(angle);
        const i0 = start + k;
        const i1 = i0 + half;
        const tr = wr * real[i1] - wi * imag[i1];
        const ti = wr * imag[i1] + wi * real[i1];
        real[i1] = real[i0] - tr;
        imag[i1] = imag[i0] - ti;
        real[i0] += tr;
        imag[i0] += ti;
      }
    }
  }
}

export function attachPcmIngestor(service: SpectrumService) {
  const ring = new Float32Array(FFT_SIZE);
  let writeIdx = 0;
  let filled = false;

  function onPcm(e: Event) {
    const detail = (e as CustomEvent).detail as { samples: Float32Array; sampleRate: number };
    const { samples, sampleRate } = detail;

    // Write into ring buffer
    for (let i = 0; i < samples.length; i++) {
      ring[writeIdx++] = samples[i];
      if (writeIdx >= FFT_SIZE) { writeIdx = 0; filled = true; }
    }

    if (!filled) return; // wait until we have one full window

    // Assemble windowed frame (oldest..newest)
    const frame = new Float32Array(FFT_SIZE);
    let idx = writeIdx; // next write position is oldest sample
    for (let i = 0; i < FFT_SIZE; i++) {
      frame[i] = ring[idx] * HANN[i];
      idx++; if (idx >= FFT_SIZE) idx = 0;
    }

    // FFT
    const real = frame;
    const imag = new Float32Array(FFT_SIZE);
    fftRadix2(real, imag);

    // Magnitude to dBFS for first N/2 bins
    const mags = new Float32Array(FFT_SIZE >> 1);
    for (let i = 0; i < mags.length; i++) {
      const re = real[i], im = imag[i];
      const m = Math.sqrt(re * re + im * im) / (FFT_SIZE / 2);
      const db = 20 * Math.log10(m + 1e-9);
      mags[i] = Math.max(-140, Math.min(-10, db));
    }

    // Decimate to BINS resolution
    const step = Math.max(1, Math.floor(mags.length / BINS));
    const out = new Float32Array(BINS);
    for (let i = 0; i < BINS; i++) {
      const start = i * step; const end = Math.min(mags.length, start + step);
      let max = -Infinity; for (let j = start; j < end; j++) if (mags[j] > max) max = mags[j];
      out[i] = (isFinite(max) ? max : -140);
    }

    service.emit({ centerHz: service.getState().centerHz, spanHz: service.getState().spanHz, sampleRate, bins: out });
  }

  window.addEventListener('pcm-samples', onPcm as EventListener);
  return () => window.removeEventListener('pcm-samples', onPcm as EventListener);
}

