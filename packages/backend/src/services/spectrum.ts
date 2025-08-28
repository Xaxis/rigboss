export type SpectrumFrame = {
  timestamp: number;
  startHz: number;
  binSizeHz: number;
  bins: number[]; // power dBFS values
};

export class SpectrumService {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    // Placeholder - will be implemented when we add real spectrum sources
    console.log('SpectrumService: start() called - not yet implemented');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
