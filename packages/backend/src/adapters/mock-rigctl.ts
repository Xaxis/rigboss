import type { RadioMode, RadioState } from "../dtos.js";
import type { RigctlAdapter } from "../services/radio.js";

export class MockRigctlAdapter implements RigctlAdapter {
  private connected = false;
  private state: Partial<RadioState> = {
    rigModel: "MOCK-IC7300",
    frequencyHz: 14074000,
    mode: "USB",
    bandwidthHz: 2800,
    power: 50,
    ptt: false,
  };

  async connect(_host: string, _port: number): Promise<void> {
    this.connected = true;
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
  async getState(): Promise<Partial<RadioState>> {
    return { connected: this.connected, ...this.state };
  }
  async setFrequency(hz: number): Promise<void> {
    this.state.frequencyHz = hz;
  }
  async setMode(mode: RadioMode, bandwidthHz?: number): Promise<void> {
    this.state.mode = mode;
    if (bandwidthHz !== undefined) this.state.bandwidthHz = bandwidthHz;
  }
  async setPower(percent: number): Promise<void> {
    this.state.power = percent;
  }
  async setPtt(ptt: boolean): Promise<void> {
    this.state.ptt = ptt;
  }
}

