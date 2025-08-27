import { SpectrumService } from './SpectrumService';
import { attachPcmIngestor } from './PcmIngestor';

export const spectrumService = new SpectrumService();
let attached = false;

export function ensureSpectrumConnected() {
  if (!attached) {
    attachPcmIngestor(spectrumService);
    attached = true;
  }
}

export * from './SpectrumService';

