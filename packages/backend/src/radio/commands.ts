import type { RigctldClient } from './client.js';
import type { RadioCapabilities, RigctlResponse } from './types.js';

// Response parsing utilities
function parseResponse(lines: string[]): RigctlResponse {
  const idx = lines.findIndex(l => l.startsWith('RPRT '));
  if (idx === -1) return { result: lines.slice(), code: null };
  
  const result = lines.slice(0, idx);
  const rprtLine = lines[idx];
  if (!rprtLine) return { result, code: null };
  
  const code = Number(rprtLine.replace('RPRT ', '').trim());
  return { result, code: Number.isFinite(code) ? code : 0 };
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value.trim());
  return Number.isFinite(num) ? num : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed === '1' ? true : trimmed === '0' ? false : undefined;
}

function parseString(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export class RadioCommands {
  constructor(private client: RigctldClient) {}

  // Core getters
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

  async getPower(): Promise<number | undefined> {
    const lines = await this.client.request('l RFPOWER', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    const fraction = parseNumber(result[0]);
    return fraction !== undefined ? Math.round(fraction * 100) : undefined;
  }

  async getVFO(): Promise<string | undefined> {
    const lines = await this.client.request('v', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return parseString(result[0]);
  }

  async getSplit(): Promise<{ split?: boolean; txVFO?: string }> {
    const lines = await this.client.request('s', 3000, { fallback: true });
    const { result } = parseResponse(lines);
    return {
      split: parseBoolean(result[0]),
      txVFO: parseString(result[1]),
    };
  }

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

  // Core setters (high priority)
  async setFrequency(hz: number): Promise<void> {
    await this.client.request(`F ${hz}`, 5000, { priority: 'HIGH' });
  }

  async setMode(mode: string, bandwidthHz?: number): Promise<void> {
    const cmd = bandwidthHz ? `M ${mode} ${bandwidthHz}` : `M ${mode}`;
    await this.client.request(cmd, 5000, { priority: 'HIGH' });
  }

  async setPower(percent: number): Promise<void> {
    const fraction = Math.max(0, Math.min(1, percent / 100));
    await this.client.request(`L RFPOWER ${fraction}`, 5000, { priority: 'HIGH' });
  }

  async setPTT(on: boolean): Promise<void> {
    await this.client.request(`T ${on ? 1 : 0}`, 5000, { priority: 'HIGH' });
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

      const supports = {
        setFrequency: true,
        setMode: true,
        setPower: levels.has('RFPOWER'),
        setPTT: funcs.has('PTT') || true,
        setVFO: vfos.size > 0,
        setRIT: funcs.has('RIT'),
        setXIT: funcs.has('XIT'),
        setSplit: true,
        setAntenna: levels.has('ANT') || funcs.has('ANT'),
        setCTCSS: levels.has('CTCSS') || funcs.has('TONE'),
        setDCS: levels.has('DCS') || funcs.has('TSQL'),
        setTuningStep: true,
        setRepeater: true,
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
        sendMorse: true,
        tune: funcs.has('TUNER') || true,
        scan: true,
        memoryOps: true,
        spectrum: levels.has('SPECTRUM_MODE') || levels.has('SPECTRUM_SPAN'),
      };

      return {
        levels: [...levels],
        funcs: [...funcs],
        modes: [...modes],
        vfos: [...vfos],
        supports,
      };
    } catch {
      return this.getDefaultCapabilities();
    }
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
        spectrum: false,
      },
    };
  }
}
