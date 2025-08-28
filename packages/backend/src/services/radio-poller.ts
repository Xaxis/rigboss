import type { RadioState } from '../types/radio.js';
import type { RigctlAdapter } from '../adapters/rigctl-adapter.js';

export class RadioPoller {
  private timer: NodeJS.Timeout | null = null;
  private tick = 0;

  constructor(
    private adapter: RigctlAdapter,
    private onStateUpdate: (state: Partial<RadioState>) => void,
    private onError: (error: Error) => void
  ) {}

  start(): void {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      try {
        await this.pollRadioState();
        this.tick++;
      } catch (error) {
        this.onError(error as Error);
      }
    }, 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.tick = 0;
    }
  }

  private async pollRadioState(): Promise<void> {
    // Core state every second - critical for UI responsiveness
    const [frequency, modeInfo, ptt, vfo, splitInfo] = await Promise.all([
      this.adapter.getFrequency(),
      this.adapter.getMode(),
      this.adapter.getPTT(),
      this.adapter.getVFO(),
      this.adapter.getSplitVFO(),
    ]);

    const coreUpdate: Partial<RadioState> = {
      frequencyHz: frequency,
      mode: modeInfo.mode,
      bandwidthHz: modeInfo.bandwidthHz,
      ptt,
      vfo,
      split: splitInfo.split,
    };

    this.onStateUpdate(coreUpdate);

    // Extended state every 3 seconds - less critical
    if (this.tick % 3 === 0) {
      const [power, swr, signal, rit, xit, alc, agc, att, preamp] = await Promise.all([
        this.adapter.getPower(),
        this.adapter.getSWR(),
        this.adapter.getSignalStrength(),
        this.adapter.getRIT(),
        this.adapter.getXIT(),
        this.adapter.getALC(),
        this.adapter.getAGC(),
        this.adapter.getAttenuator(),
        this.adapter.getPreamp(),
      ]);

      const extendedUpdate: Partial<RadioState> = {
        power,
        swr,
        signalStrength: signal,
        rit,
        xit,
        alc,
        agc,
        attenuator: att,
        preamp,
      };

      this.onStateUpdate(extendedUpdate);
    }

    // Comprehensive state every 10 seconds - detailed info
    if (this.tick % 10 === 0) {
      const [
        antenna, memory, tuningStep, ctcssTone, dcsCode,
        afGain, rfGain, squelch, micGain, keySpeed, voxGain, antiVox, compLevel,
        dcd, powerStatus, transceive
      ] = await Promise.all([
        this.adapter.getAntenna(),
        this.adapter.getMemory(),
        this.adapter.getTuningStep(),
        this.adapter.getCTCSSTone(),
        this.adapter.getDCSCode(),
        this.adapter.getAFGain(),
        this.adapter.getRFGain(),
        this.adapter.getSquelch(),
        this.adapter.getMicGain(),
        this.adapter.getKeySpeed(),
        this.adapter.getVOXGain(),
        this.adapter.getAntiVOX(),
        this.adapter.getCompLevel(),
        this.adapter.getDCD(),
        this.adapter.getPowerStatus(),
        this.adapter.getTransceive(),
      ]);

      const comprehensiveUpdate: Partial<RadioState> = {
        antenna: antenna.antenna,
        antennaOption: antenna.option,
        memory,
        tuningStep,
        ctcssTone,
        dcsCode,
        afGain,
        rfGain,
        squelch,
        micGain,
        keySpeed,
        voxGain,
        antiVox,
        compLevel,
        dcd,
        powerStatus,
        transceive,
      };

      this.onStateUpdate(comprehensiveUpdate);
    }

    // Rig info every 30 seconds - static info
    if (this.tick % 30 === 0) {
      const [info, rigInfo] = await Promise.all([
        this.adapter.getInfo(),
        this.adapter.getRigInfo(),
      ]);

      const infoUpdate: Partial<RadioState> = {
        rigInfo: info || rigInfo,
      };

      this.onStateUpdate(infoUpdate);
    }
  }
}
