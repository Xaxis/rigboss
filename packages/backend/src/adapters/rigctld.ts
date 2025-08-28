import { Socket } from 'net';
import { RigctlAdapter, RadioState } from '../types/radio';

export class RigctldAdapter implements RigctlAdapter {
  private socket: Socket | null = null;
  private connected = false;
  private host = 'localhost';
  private port = 4532;

  async connect(host: string, port: number): Promise<void> {
    this.host = host || 'localhost';
    this.port = port || 4532;

    return new Promise((resolve, reject) => {
      this.socket = new Socket();
      
      this.socket.connect(this.port, this.host, () => {
        console.log(`✅ Connected to rigctld at ${this.host}:${this.port}`);
        this.connected = true;
        resolve();
      });

      this.socket.on('error', (error) => {
        console.error(`❌ Rigctld connection error:`, error);
        this.connected = false;
        reject(error);
      });

      this.socket.on('close', () => {
        console.log('📡 Rigctld connection closed');
        this.connected = false;
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.connected = false;
  }

  private async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Not connected to rigctld'));
        return;
      }

      let response = '';
      
      const onData = (data: Buffer) => {
        response += data.toString();
        // Check if we have a complete response (ends with newline)
        if (response.includes('\n')) {
          this.socket!.off('data', onData);
          resolve(response.trim());
        }
      };

      this.socket.on('data', onData);
      
      // Send command
      this.socket.write(command + '\n');
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.socket!.off('data', onData);
        reject(new Error(`Command timeout: ${command}`));
      }, 5000);
    });
  }

  async getFrequency(): Promise<number> {
    const response = await this.sendCommand('f');
    const freq = parseInt(response.trim());
    return freq;
  }

  async setFrequency(frequency: number): Promise<void> {
    await this.sendCommand(`F ${frequency}`);
  }

  async getMode(): Promise<{ mode: string; bandwidth: number }> {
    const response = await this.sendCommand('m');
    const lines = response.trim().split('\n');
    const mode = lines[0] || 'USB';
    const bandwidth = lines.length > 1 ? parseInt(lines[1]) : 2400;
    return { mode, bandwidth };
  }

  async setMode(mode: string, bandwidth?: number): Promise<void> {
    const bw = bandwidth || 2400;
    await this.sendCommand(`M ${mode} ${bw}`);
  }

  async getPower(): Promise<number> {
    const response = await this.sendCommand('l RFPOWER');
    const power = parseFloat(response.trim()) * 100; // Convert 0.0-1.0 to 0-100
    return Math.round(Math.max(0, Math.min(100, power))); // Clamp to 0-100
  }

  async setPower(power: number): Promise<void> {
    const powerLevel = power / 100; // Convert 0-100 to 0.0-1.0
    await this.sendCommand(`L RFPOWER ${powerLevel}`);
  }

  async getPTT(): Promise<boolean> {
    const res = await this.sendCommand('t');
    return res.trim() === '1';
  }

  async setPtt(ptt: boolean): Promise<void> {
    await this.sendCommand(`T ${ptt ? 1 : 0}`);
  }

  async getState(): Promise<Partial<RadioState>> {
    try {
      const [frequency, modeInfo, power, ptt] = await Promise.all([
        this.getFrequency(),
        this.getMode(),
        this.getPower(),
        this.getPTT().catch(() => false),
      ]);

      const state = {
        connected: this.connected,
        frequencyHz: frequency,
        mode: modeInfo.mode as any,
        bandwidthHz: modeInfo.bandwidth,
        power: power,
        ptt,
        rigModel: 'IC-7300',
      };

      return state;
    } catch (error) {
      return {
        connected: false,
      };
    }
  }
}
