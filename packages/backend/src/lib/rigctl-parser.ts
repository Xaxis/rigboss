import type { RigctlResponse } from '../types/radio.js';

export function parseResponse(lines: string[]): RigctlResponse {
  const idx = lines.findIndex(l => l.startsWith('RPRT '));
  if (idx === -1) return { result: lines.slice(), code: null };
  
  const result = lines.slice(0, idx);
  const rprtLine = lines[idx];
  if (!rprtLine) return { result, code: null };
  
  const code = Number(rprtLine.replace('RPRT ', '').trim());
  return { result, code: Number.isFinite(code) ? code : 0 };
}

export function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const num = Number(value.trim());
  return Number.isFinite(num) ? num : undefined;
}

export function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed === '1') return true;
  if (trimmed === '0') return false;
  return undefined;
}

export function parseString(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}
