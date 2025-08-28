export type SpectrumFrame = {
  timestamp: number;
  startHz: number;
  binSizeHz: number;
  bins: number[]; // power dBFS values
};

export class SpectrumService {
  private timer: NodeJS.Timeout | null = null;

  start(mockHz = 7_100_000, spanHz = 96_000, fps = 20): void {
    if (this.timer) return;
    const binCount = 1024;
    const binSizeHz = Math.floor(spanHz / binCount);
    this.timer = setInterval(() => {
      const bins = Array.from({ length: binCount }, (_, i) => {
        // Generate a simple mock spectrum with a couple of peaks
        const x = i / binCount;
        const noise = -90 + Math.random() * 3;
        const tone1 = -30 * Math.exp(-((x - 0.3) ** 2) / 0.0008);
        const tone2 = -40 * Math.exp(-((x - 0.65) ** 2) / 0.0012);
        return Math.max(noise, tone1, tone2);
      });
      const frame: SpectrumFrame = {
        timestamp: Date.now(),
        startHz: mockHz - Math.floor(spanHz / 2),
        binSizeHz,
        bins,
      };
      // Emission is handled by index.ts wiring via provided emitter
      // In phase 2, we will inject an emitter or return frames via callback
    }, Math.max(10, Math.floor(1000 / fps)));
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

