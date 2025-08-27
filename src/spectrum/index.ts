import { SpectrumService } from './SpectrumService';
import { AudioSpectrumTap } from './AudioSpectrumTap';
import { attachPcmIngestor } from './PcmIngestor';

export const spectrumService = new SpectrumService();
let attached = false;

let tap: AudioSpectrumTap | null = null;

export async function ensureSpectrumConnected() {
  if (!(spectrumService as any)._connected) {
    spectrumService.connect();
    (spectrumService as any)._connected = true;
  }
  if (!attached) {
    attachPcmIngestor(spectrumService);
    attached = true;
  }
  if (!tap) {
    tap = new AudioSpectrumTap();
    tap.connect().catch(() => {});
  }
}

export * from './SpectrumService';

