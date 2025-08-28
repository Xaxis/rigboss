import { EventEmitter } from "node:events";
import type { SpectrumSettings, SpectrumFrame } from "../dtos.js";
import { EVENTS } from "../events.js";

export interface SpectrumServiceOptions {}

export class SpectrumService extends EventEmitter {
  private settings: SpectrumSettings = {
    centerHz: 14_074_000,
    spanHz: 48_000,
    fftSize: 1024,
    averaging: 1,
    refLevel: 0,
    colorMap: "viridis",
  };

  setSettings(next: Partial<SpectrumSettings>) {
    this.settings = { ...this.settings, ...next };
    this.emit(EVENTS.SPECTRUM_SETTINGS_CHANGED, this.settings);
  }

  getSettings() {
    return this.settings;
  }

  // For now: emit a dummy frame when called, real PCM/IQ integration later
  emitDummyFrame() {
    const bins = this.settings.fftSize;
    const frame: SpectrumFrame = {
      timestamp: Date.now(),
      startHz: this.settings.centerHz - this.settings.spanHz / 2,
      binSizeHz: this.settings.spanHz / bins,
      db: Array.from({ length: bins }, (_, i) => -90 + 10 * Math.sin(i / 10)),
    };
    this.emit(EVENTS.SPECTRUM_FRAME, frame);
  }
}

