import type { RadioCapabilities } from '../types/radio.js';
import type { RigctldClient } from '../lib/rigctld-client.js';
import { parseResponse, parseNumber, parseBoolean, parseString } from '../lib/rigctl-parser.js';

export class RigctlAdapter {
  constructor(private client: RigctldClient) {}

  // COMPREHENSIVE RIGCTL GETTERS - Based on rigctl documentation

  // Core frequency/mode/power
  async getFrequency(): Promise<number | undefined> {
    const lines = await this.client.request('f', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getMode(): Promise<{ mode?: string; bandwidthHz?: number }> {
    const lines = await this.client.request('m', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return {
      mode: parseString(result[0]),
      bandwidthHz: parseNumber(result[1]),
    };
  }

  async getPTT(): Promise<boolean | undefined> {
    const lines = await this.client.request('t', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseBoolean(result[0]);
  }

  // VFO operations
  async getVFO(): Promise<string | undefined> {
    const lines = await this.client.request('v', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  async getSplitVFO(): Promise<{ split?: boolean; txVFO?: string }> {
    const lines = await this.client.request('s', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return {
      split: parseBoolean(result[0]),
      txVFO: parseString(result[1]),
    };
  }

  async getSplitFrequency(): Promise<number | undefined> {
    const lines = await this.client.request('i', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getSplitMode(): Promise<{ mode?: string; bandwidthHz?: number }> {
    const lines = await this.client.request('x', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return {
      mode: parseString(result[0]),
      bandwidthHz: parseNumber(result[1]),
    };
  }

  // RIT/XIT
  async getRIT(): Promise<number | undefined> {
    const lines = await this.client.request('j', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getXIT(): Promise<number | undefined> {
    const lines = await this.client.request('z', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  // Antenna
  async getAntenna(): Promise<{ antenna?: number; option?: number }> {
    const lines = await this.client.request('y 0', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return {
      antenna: parseNumber(result[0]),
      option: parseNumber(result[1]),
    };
  }

  // Repeater
  async getRepeaterShift(): Promise<string | undefined> {
    const lines = await this.client.request('r', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  async getRepeaterOffset(): Promise<number | undefined> {
    const lines = await this.client.request('o', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  // CTCSS/DCS
  async getCTCSSTone(): Promise<number | undefined> {
    const lines = await this.client.request('c', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getDCSCode(): Promise<string | undefined> {
    const lines = await this.client.request('d', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  async getCTCSSSQL(): Promise<number | undefined> {
    const lines = await this.client.request('\x91', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getDCSSQL(): Promise<string | undefined> {
    const lines = await this.client.request('\x93', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  // Tuning step
  async getTuningStep(): Promise<number | undefined> {
    const lines = await this.client.request('n', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  // Memory operations
  async getMemory(): Promise<number | undefined> {
    const lines = await this.client.request('e', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  // Levels - comprehensive coverage
  async getPower(): Promise<number | undefined> {
    const lines = await this.client.request('l RFPOWER', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    const fraction = parseNumber(result[0]);
    return fraction !== undefined ? Math.round(fraction * 100) : undefined;
  }

  async getSWR(): Promise<number | undefined> {
    const lines = await this.client.request('l SWR', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getSignalStrength(): Promise<number | undefined> {
    const lines = await this.client.request('l STRENGTH', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    const strength = parseNumber(result[0]);
    return strength !== undefined ? -127 + strength * 107 : undefined;
  }

  async getALC(): Promise<number | undefined> {
    const lines = await this.client.request('l ALC', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getAFGain(): Promise<number | undefined> {
    const lines = await this.client.request('l AF', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getRFGain(): Promise<number | undefined> {
    const lines = await this.client.request('l RF', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getSquelch(): Promise<number | undefined> {
    const lines = await this.client.request('l SQL', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getMicGain(): Promise<number | undefined> {
    const lines = await this.client.request('l MICGAIN', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getKeySpeed(): Promise<number | undefined> {
    const lines = await this.client.request('l KEYSPD', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getVOXGain(): Promise<number | undefined> {
    const lines = await this.client.request('l VOXGAIN', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getAntiVOX(): Promise<number | undefined> {
    const lines = await this.client.request('l ANTIVOX', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getCompLevel(): Promise<number | undefined> {
    const lines = await this.client.request('l COMP', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getAGC(): Promise<string | undefined> {
    const lines = await this.client.request('l AGC', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    const agcValue = parseNumber(result[0]);
    if (agcValue === undefined) return undefined;
    const agcMap = ['OFF', 'SUPERFAST', 'FAST', 'SLOW', 'USER', 'MEDIUM', 'AUTO'];
    return agcMap[agcValue] || 'UNKNOWN';
  }

  async getAttenuator(): Promise<number | undefined> {
    const lines = await this.client.request('l ATT', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  async getPreamp(): Promise<number | undefined> {
    const lines = await this.client.request('l PREAMP', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  // Functions - comprehensive coverage
  async getFunc(func: string): Promise<boolean | undefined> {
    const lines = await this.client.request(`u ${func}`, 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseBoolean(result[0]);
  }

  // DCD (squelch status)
  async getDCD(): Promise<boolean | undefined> {
    const lines = await this.client.request('\x8b', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseBoolean(result[0]);
  }

  // Power status
  async getPowerStatus(): Promise<number | undefined> {
    const lines = await this.client.request('\x88', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseNumber(result[0]);
  }

  // Transceive mode
  async getTransceive(): Promise<string | undefined> {
    const lines = await this.client.request('a', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  // Info
  async getInfo(): Promise<string | undefined> {
    const lines = await this.client.request('_', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return result.join(' ');
  }

  async getRigInfo(): Promise<string | undefined> {
    const lines = await this.client.request('\xf5', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return result.join(' ');
  }

  async getVFOInfo(vfo: string): Promise<string | undefined> {
    const lines = await this.client.request(`\xf3 ${vfo}`, 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return result.join(' ');
  }

  // COMPREHENSIVE RIGCTL SETTERS - Based on rigctl documentation

  // Core setters (high priority)
  async setFrequency(hz: number): Promise<void> {
    await this.client.request(`F ${hz}`, 5000, { priority: 'HIGH' });
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    const cmd = bandwidthHz ? `M ${mode} ${bandwidthHz}` : `M ${mode}`;
    await this.client.request(cmd, 5000, { priority: 'HIGH' });
  }

  async setPTT(on: boolean): Promise<void> {
    await this.client.request(`T ${on ? 1 : 0}`, 5000, { priority: 'HIGH' });
  }

  // VFO operations
  async setVFO(vfo: string): Promise<void> {
    await this.client.request(`V ${vfo}`, 5000, { priority: 'HIGH' });
  }

  async setSplitVFO(split: boolean, txVFO: string): Promise<void> {
    await this.client.request(`S ${split ? 1 : 0} ${txVFO}`, 5000, { priority: 'HIGH' });
  }

  async setSplitFrequency(hz: number): Promise<void> {
    await this.client.request(`I ${hz}`, 5000, { priority: 'HIGH' });
  }

  async setSplitMode(mode: string, bandwidthHz?: number): Promise<void> {
    const cmd = bandwidthHz ? `X ${mode} ${bandwidthHz}` : `X ${mode}`;
    await this.client.request(cmd, 5000, { priority: 'HIGH' });
  }

  // RIT/XIT
  async setRIT(hz: number): Promise<void> {
    await this.client.request(`J ${hz}`, 5000, { priority: 'HIGH' });
  }

  async setXIT(hz: number): Promise<void> {
    await this.client.request(`Z ${hz}`, 5000, { priority: 'HIGH' });
  }

  // Antenna
  async setAntenna(antenna: number, option?: number): Promise<void> {
    const cmd = option !== undefined ? `Y ${antenna} ${option}` : `Y ${antenna}`;
    await this.client.request(cmd, 5000, { priority: 'HIGH' });
  }

  // Repeater
  async setRepeaterShift(shift: string): Promise<void> {
    await this.client.request(`R ${shift}`, 5000, { priority: 'HIGH' });
  }

  async setRepeaterOffset(hz: number): Promise<void> {
    await this.client.request(`O ${hz}`, 5000, { priority: 'HIGH' });
  }

  // CTCSS/DCS
  async setCTCSSTone(tone: number): Promise<void> {
    await this.client.request(`C ${tone}`, 5000, { priority: 'HIGH' });
  }

  async setDCSCode(code: string): Promise<void> {
    await this.client.request(`D ${code}`, 5000, { priority: 'HIGH' });
  }

  async setCTCSSSQL(tone: number): Promise<void> {
    await this.client.request(`\x90 ${tone}`, 5000, { priority: 'HIGH' });
  }

  async setDCSSQL(code: string): Promise<void> {
    await this.client.request(`\x92 ${code}`, 5000, { priority: 'HIGH' });
  }

  // Tuning step
  async setTuningStep(hz: number): Promise<void> {
    await this.client.request(`N ${hz}`, 5000, { priority: 'HIGH' });
  }

  // Memory operations
  async setMemory(channel: number): Promise<void> {
    await this.client.request(`E ${channel}`, 5000, { priority: 'HIGH' });
  }

  async setBank(bank: number): Promise<void> {
    await this.client.request(`B ${bank}`, 5000, { priority: 'HIGH' });
  }

  // Levels - comprehensive coverage
  async setPower(percent: number): Promise<void> {
    const fraction = Math.max(0, Math.min(1, percent / 100));
    await this.client.request(`L RFPOWER ${fraction}`, 5000, { priority: 'HIGH' });
  }

  async setAFGain(level: number): Promise<void> {
    await this.client.request(`L AF ${level}`, 5000, { priority: 'HIGH' });
  }

  async setRFGain(level: number): Promise<void> {
    await this.client.request(`L RF ${level}`, 5000, { priority: 'HIGH' });
  }

  async setSquelch(level: number): Promise<void> {
    await this.client.request(`L SQL ${level}`, 5000, { priority: 'HIGH' });
  }

  async setMicGain(level: number): Promise<void> {
    await this.client.request(`L MICGAIN ${level}`, 5000, { priority: 'HIGH' });
  }

  async setKeySpeed(wpm: number): Promise<void> {
    await this.client.request(`L KEYSPD ${wpm}`, 5000, { priority: 'HIGH' });
  }

  async setVOXGain(level: number): Promise<void> {
    await this.client.request(`L VOXGAIN ${level}`, 5000, { priority: 'HIGH' });
  }

  async setAntiVOX(level: number): Promise<void> {
    await this.client.request(`L ANTIVOX ${level}`, 5000, { priority: 'HIGH' });
  }

  async setCompLevel(level: number): Promise<void> {
    await this.client.request(`L COMP ${level}`, 5000, { priority: 'HIGH' });
  }

  async setAGC(mode: string): Promise<void> {
    const agcMap: Record<string, number> = {
      'OFF': 0, 'SUPERFAST': 1, 'FAST': 2, 'SLOW': 3, 'USER': 4, 'MEDIUM': 5, 'AUTO': 6
    };
    const value = agcMap[mode.toUpperCase()] ?? 0;
    await this.client.request(`L AGC ${value}`, 5000, { priority: 'HIGH' });
  }

  async setAttenuator(db: number): Promise<void> {
    await this.client.request(`L ATT ${db}`, 5000, { priority: 'HIGH' });
  }

  async setPreamp(db: number): Promise<void> {
    await this.client.request(`L PREAMP ${db}`, 5000, { priority: 'HIGH' });
  }

  // Functions - comprehensive coverage
  async setFunc(func: string, status: boolean): Promise<void> {
    await this.client.request(`U ${func} ${status ? 1 : 0}`, 5000, { priority: 'HIGH' });
  }

  // Power status
  async setPowerStatus(status: number): Promise<void> {
    await this.client.request(`\x87 ${status}`, 5000, { priority: 'HIGH' });
  }

  // Transceive mode
  async setTransceive(mode: string): Promise<void> {
    await this.client.request(`A ${mode}`, 5000, { priority: 'HIGH' });
  }

  // VFO operations
  async vfoOp(operation: string): Promise<void> {
    await this.client.request(`G ${operation}`, 5000, { priority: 'HIGH' });
  }

  // Scan operations
  async scan(scanFunction: string, channel?: number): Promise<void> {
    const cmd = channel !== undefined ? `g ${scanFunction} ${channel}` : `g ${scanFunction}`;
    await this.client.request(cmd, 5000, { priority: 'HIGH' });
  }

  // Morse code
  async sendMorse(message: string): Promise<void> {
    await this.client.request(`b ${message}`, 5000, { priority: 'HIGH' });
  }

  // DTMF
  async sendDTMF(digits: string): Promise<void> {
    await this.client.request(`\x89 ${digits}`, 5000, { priority: 'HIGH' });
  }

  async receiveDTMF(): Promise<string | undefined> {
    const lines = await this.client.request('\x8a', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  // Reset
  async reset(type: number): Promise<void> {
    await this.client.request(`* ${type}`, 5000, { priority: 'HIGH' });
  }

  // Raw commands
  async sendCommand(cmd: string): Promise<string> {
    const lines = await this.client.request(`w ${cmd}`, 5000, { priority: 'HIGH' });
    const { result } = parseResponse(lines);
    return result.join('\n');
  }

  async sendCommandExpectBytes(cmd: string, nbytes: number): Promise<string> {
    const lines = await this.client.request(`W ${cmd} ${nbytes}`, 5000, { priority: 'HIGH' });
    const { result } = parseResponse(lines);
    return result.join('\n');
  }

  // Capabilities discovery
  async getCapabilities(): Promise<RadioCapabilities> {
    try {
      const lines = await this.client.request('dump_caps', 8000, { fallback: true });
      const { result } = parseResponse(lines);

      const levels = new Set<string>();
      const funcs = new Set<string>();
      const modes = new Set<string>();
      const vfos = new Set<string>();

      for (const raw of result) {
        const line = raw.trim();
        if (/^Level:/i.test(line)) {
          line.replace(/^Level:\s*/i, '').split(/\s+/).forEach(t => t && levels.add(t));
        } else if (/^Func:/i.test(line)) {
          line.replace(/^Func:\s*/i, '').split(/\s+/).forEach(t => t && funcs.add(t));
        } else if (/^Mode:/i.test(line)) {
          line.replace(/^Mode:\s*/i, '').split(/\s+/).forEach(t => t && modes.add(t));
        } else if (/^VFO:/i.test(line)) {
          line.replace(/^VFO:\s*/i, '').split(/\s+/).forEach(t => t && vfos.add(t));
        }
      }

      const supports = this.buildSupportsFromCapabilities(levels, funcs);
      const verifiedLevels = await this.verifyLevels(levels);
      const verifiedFuncs = await this.verifyFuncs(funcs);

      return {
        levels: [...levels],
        funcs: [...funcs],
        modes: [...modes],
        vfos: [...vfos],
        supports,
        verifiedLevels,
        verifiedFuncs,
      };
    } catch {
      return this.getDefaultCapabilities();
    }
  }

  private buildSupportsFromCapabilities(levels: Set<string>, funcs: Set<string>) {
    return {
      setFrequency: true, // F command - universal
      setMode: true, // M command - universal
      setPower: levels.has('RFPOWER'),
      setPTT: funcs.has('PTT') || true, // T command usually supported
      setVFO: true, // V command commonly supported
      setRIT: funcs.has('RIT'),
      setXIT: funcs.has('XIT'),
      setSplit: true, // S command commonly supported
      setAntenna: levels.has('ANT') || funcs.has('ANT'),
      setCTCSS: levels.has('CTCSS') || funcs.has('TONE'),
      setDCS: levels.has('DCS') || funcs.has('TSQL'),
      setTuningStep: true, // N command commonly supported
      setRepeater: true, // R/O commands commonly supported
      setAGC: levels.has('AGC') || funcs.has('AGC'),
      setNoiseBlanker: funcs.has('NB'),
      setNoiseReduction: funcs.has('NR'),
      setAttenuator: levels.has('ATT'),
      setPreamp: levels.has('PREAMP'),
      setSquelch: levels.has('SQL'),
      setRFGain: levels.has('RF'),
      setAFGain: levels.has('AF'),
      setMicGain: levels.has('MICGAIN'),
      setKeySpeed: levels.has('KEYSPD'),
      setVOX: levels.has('VOXGAIN') || funcs.has('VOX'),
      setCompressor: levels.has('COMP') || funcs.has('COMP'),
      setMonitor: funcs.has('MON'),
      setBreakIn: funcs.has('FBKIN') || funcs.has('SBKIN'),
      sendMorse: true, // b command commonly supported
      tune: funcs.has('TUNER') || true, // G TUNE operation
      scan: true, // g command commonly supported
      memoryOps: true, // E/e/G commands commonly supported
    };
  }

  private async verifyLevels(levels: Set<string>): Promise<Record<string, boolean>> {
    const verifiedLevels: Record<string, boolean> = {};
    const criticalLevels = [
      'RFPOWER', 'STRENGTH', 'SWR', 'AGC', 'ATT', 'PREAMP', 'SQL', 'RF', 'AF',
      'MICGAIN', 'KEYSPD', 'VOXGAIN', 'ANTIVOX', 'COMP', 'ALC'
    ];

    for (const name of criticalLevels) {
      if (levels.has(name)) {
        try {
          const lines = await this.client.request(`l ${name}`, 3000, { fallback: true });
          const { result } = parseResponse(lines);
          verifiedLevels[name] = result.length > 0;
        } catch {
          verifiedLevels[name] = false;
        }
      }
    }

    return verifiedLevels;
  }

  private async verifyFuncs(funcs: Set<string>): Promise<Record<string, boolean>> {
    const verifiedFuncs: Record<string, boolean> = {};
    const criticalFuncs = [
      'PTT', 'RIT', 'XIT', 'SPLIT', 'NB', 'NR', 'VOX', 'COMP', 'MON', 'FBKIN', 'SBKIN', 'TUNER'
    ];

    for (const name of criticalFuncs) {
      if (funcs.has(name)) {
        try {
          const lines = await this.client.request(`u ${name}`, 3000, { fallback: true });
          const { result } = parseResponse(lines);
          verifiedFuncs[name] = result.length > 0;
        } catch {
          verifiedFuncs[name] = false;
        }
      }
    }

    return verifiedFuncs;
  }

  private getDefaultCapabilities(): RadioCapabilities {
    return {
      levels: [],
      funcs: [],
      modes: [],
      vfos: [],
      supports: {
        setFrequency: true,
        setMode: true,
        setPower: false,
        setPTT: true,
        setVFO: false,
        setRIT: false,
        setXIT: false,
        setSplit: false,
        setAntenna: false,
        setCTCSS: false,
        setDCS: false,
        setTuningStep: false,
        setRepeater: false,
        setAGC: false,
        setNoiseBlanker: false,
        setNoiseReduction: false,
        setAttenuator: false,
        setPreamp: false,
        setSquelch: false,
        setRFGain: false,
        setAFGain: false,
        setMicGain: false,
        setKeySpeed: false,
        setVOX: false,
        setCompressor: false,
        setMonitor: false,
        setBreakIn: false,
        sendMorse: false,
        tune: false,
        scan: false,
        memoryOps: false,
      },
    };
  }
}
