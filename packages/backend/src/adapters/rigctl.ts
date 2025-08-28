import { spawn, ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { RadioMode, RadioState } from '../dtos.js';
import type { RigctlAdapter } from '../services/radio.js';

export interface RigctlOptions {
  rigModel?: number;
  rigPort?: string;
  rigSpeed?: number;
  timeout?: number;
}

export class RigctlCommandAdapter implements RigctlAdapter {
  private options: Required<RigctlOptions>;
  private connected = false;

  constructor(options: RigctlOptions = {}) {
    this.options = {
      rigModel: options.rigModel || 3085, // Default to IC-7300
      rigPort: options.rigPort || '/dev/ttyUSB0',
      rigSpeed: options.rigSpeed || 19200,
      timeout: options.timeout || 5000,
    };
  }

  async connect(_host: string, _port: number): Promise<void> {
    // Test connection by getting frequency
    try {
      await this.executeCommand('f');
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to radio: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getState(): Promise<Partial<RadioState>> {
    if (!this.connected) {
      return { connected: false };
    }

    try {
      const [frequency, mode, power] = await Promise.all([
        this.getFrequency(),
        this.getMode(),
        this.getPowerLevel(),
      ]);

      return {
        connected: true,
        rigModel: `RIG-${this.options.rigModel}`,
        frequencyHz: frequency,
        mode: mode.mode,
        bandwidthHz: mode.bandwidth,
        power: power,
        ptt: await this.getPTT(),
      };
    } catch (error) {
      console.error('Failed to get radio state:', error);
      return { connected: false };
    }
  }

  async setFrequency(hz: number): Promise<void> {
    await this.executeCommand('F', hz.toString());
  }

  async setMode(mode: RadioMode, bandwidthHz?: number): Promise<void> {
    // Convert our mode to rigctl mode
    const rigctlMode = this.convertToRigctlMode(mode);
    if (bandwidthHz) {
      await this.executeCommand('M', rigctlMode, bandwidthHz.toString());
    } else {
      await this.executeCommand('M', rigctlMode);
    }
  }

  async setPower(percent: number): Promise<void> {
    // Convert percentage to rigctl power level (0.0 - 1.0)
    const powerLevel = (percent / 100).toFixed(2);
    await this.executeCommand('L', 'RFPOWER', powerLevel);
  }

  async setPtt(ptt: boolean): Promise<void> {
    await this.executeCommand('T', ptt ? '1' : '0');
  }

  private async getFrequency(): Promise<number> {
    const result = await this.executeCommand('f');
    return parseInt(result.trim());
  }

  private async getMode(): Promise<{ mode: RadioMode; bandwidth: number }> {
    const result = await this.executeCommand('m');
    const parts = result.trim().split('\n');
    const mode = this.convertFromRigctlMode(parts[0]);
    const bandwidth = parts[1] ? parseInt(parts[1]) : 2800;
    return { mode, bandwidth };
  }

  private async getPowerLevel(): Promise<number> {
    try {
      const result = await this.executeCommand('l', 'RFPOWER');
      const powerLevel = parseFloat(result.trim());
      return Math.round(powerLevel * 100); // Convert to percentage
    } catch {
      return 50; // Default if not supported
    }
  }

  private async getPTT(): Promise<boolean> {
    try {
      const result = await this.executeCommand('t');
      return result.trim() === '1';
    } catch {
      return false;
    }
  }

  private async executeCommand(command: string, ...args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const rigctlArgs = [
        '-m', this.options.rigModel.toString(),
        '-r', this.options.rigPort,
        '-s', this.options.rigSpeed.toString(),
        command,
        ...args
      ];

      const process = spawn('rigctl', rigctlArgs);
      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout: rigctl ${rigctlArgs.join(' ')}`));
      }, this.options.timeout);

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`rigctl failed (code ${code}): ${stderr || stdout}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn rigctl: ${error.message}`));
      });
    });
  }

  private convertToRigctlMode(mode: RadioMode): string {
    const modeMap: Record<RadioMode, string> = {
      'LSB': 'LSB',
      'USB': 'USB',
      'CW': 'CW',
      'CWR': 'CWR',
      'AM': 'AM',
      'FM': 'FM',
      'WFM': 'WFM',
      'RTTY': 'RTTY',
      'RTTYR': 'RTTYR',
      'PSK': 'PSK',
      'PSKR': 'PSKR',
    };
    return modeMap[mode] || 'USB';
  }

  private convertFromRigctlMode(rigctlMode: string): RadioMode {
    const modeMap: Record<string, RadioMode> = {
      'LSB': 'LSB',
      'USB': 'USB',
      'CW': 'CW',
      'CWR': 'CWR',
      'AM': 'AM',
      'FM': 'FM',
      'WFM': 'WFM',
      'RTTY': 'RTTY',
      'RTTYR': 'RTTYR',
      'PSK': 'PSK',
      'PSKR': 'PSKR',
    };
    return modeMap[rigctlMode] || 'USB';
  }
}

// Alternative: rigctld daemon adapter for better performance
export class RigctldAdapter implements RigctlAdapter {
  private connected = false;
  private host = '127.0.0.1';
  private port = 4532;

  async connect(host: string, port: number): Promise<void> {
    this.host = host;
    this.port = port;
    
    // Test connection
    try {
      await this.sendCommand('f');
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to rigctld at ${host}:${port}: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getState(): Promise<Partial<RadioState>> {
    if (!this.connected) {
      return { connected: false };
    }

    try {
      const [frequency, mode] = await Promise.all([
        this.sendCommand('f'),
        this.sendCommand('m'),
      ]);

      const freq = parseInt(frequency.trim());
      const modeData = mode.trim().split('\n');
      
      return {
        connected: true,
        frequencyHz: freq,
        mode: this.convertFromRigctlMode(modeData[0]) as RadioMode,
        bandwidthHz: modeData[1] ? parseInt(modeData[1]) : 2800,
      };
    } catch (error) {
      console.error('Failed to get radio state:', error);
      return { connected: false };
    }
  }

  async setFrequency(hz: number): Promise<void> {
    await this.sendCommand(`F ${hz}`);
  }

  async setMode(mode: RadioMode, bandwidthHz?: number): Promise<void> {
    const rigctlMode = this.convertToRigctlMode(mode);
    if (bandwidthHz) {
      await this.sendCommand(`M ${rigctlMode} ${bandwidthHz}`);
    } else {
      await this.sendCommand(`M ${rigctlMode}`);
    }
  }

  async setPower(percent: number): Promise<void> {
    const powerLevel = (percent / 100).toFixed(2);
    await this.sendCommand(`L RFPOWER ${powerLevel}`);
  }

  async setPtt(ptt: boolean): Promise<void> {
    await this.sendCommand(`T ${ptt ? '1' : '0'}`);
  }

  private async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();
      let response = '';

      socket.setTimeout(5000);

      socket.connect(this.port, this.host, () => {
        socket.write(command + '\n');
      });

      socket.on('data', (data) => {
        response += data.toString();
        if (response.includes('\n')) {
          socket.destroy();
          resolve(response);
        }
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Command timeout'));
      });

      socket.on('error', (error) => {
        reject(error);
      });
    });
  }

  private convertToRigctlMode(mode: RadioMode): string {
    // Same as RigctlCommandAdapter
    const modeMap: Record<RadioMode, string> = {
      'LSB': 'LSB', 'USB': 'USB', 'CW': 'CW', 'CWR': 'CWR',
      'AM': 'AM', 'FM': 'FM', 'WFM': 'WFM', 'RTTY': 'RTTY',
      'RTTYR': 'RTTYR', 'PSK': 'PSK', 'PSKR': 'PSKR',
    };
    return modeMap[mode] || 'USB';
  }

  private convertFromRigctlMode(rigctlMode: string): RadioMode {
    // Same as RigctlCommandAdapter
    const modeMap: Record<string, RadioMode> = {
      'LSB': 'LSB', 'USB': 'USB', 'CW': 'CW', 'CWR': 'CWR',
      'AM': 'AM', 'FM': 'FM', 'WFM': 'WFM', 'RTTY': 'RTTY',
      'RTTYR': 'RTTYR', 'PSK': 'PSK', 'PSKR': 'PSKR',
    };
    return modeMap[rigctlMode] || 'USB';
  }
}
