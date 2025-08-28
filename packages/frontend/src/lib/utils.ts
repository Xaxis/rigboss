import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Frequency formatting utilities
export function formatFrequency(hz: number): string {
  if (hz >= 1000000000) {
    return `${(hz / 1000000000).toFixed(3)} GHz`;
  } else if (hz >= 1000000) {
    return `${(hz / 1000000).toFixed(3)} MHz`;
  } else if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1)} kHz`;
  } else {
    return `${hz} Hz`;
  }
}

export function parseFrequency(input: string): number {
  const cleanInput = input.trim().toLowerCase();
  const numMatch = cleanInput.match(/^(\d+(?:\.\d+)?)/);
  
  if (!numMatch) return 0;
  
  const num = parseFloat(numMatch[1]);
  
  if (cleanInput.includes('ghz')) {
    return num * 1000000000;
  } else if (cleanInput.includes('mhz')) {
    return num * 1000000;
  } else if (cleanInput.includes('khz')) {
    return num * 1000;
  } else {
    // Assume MHz if no unit specified and number is reasonable
    if (num > 0 && num < 1000) {
      return num * 1000000;
    }
    return num;
  }
}

export function getFrequencyBand(hz: number): string {
  if (hz >= 1800000 && hz <= 2000000) return '160m';
  if (hz >= 3500000 && hz <= 4000000) return '80m';
  if (hz >= 5330000 && hz <= 5405000) return '60m';
  if (hz >= 7000000 && hz <= 7300000) return '40m';
  if (hz >= 10100000 && hz <= 10150000) return '30m';
  if (hz >= 14000000 && hz <= 14350000) return '20m';
  if (hz >= 18068000 && hz <= 18168000) return '17m';
  if (hz >= 21000000 && hz <= 21450000) return '15m';
  if (hz >= 24890000 && hz <= 24990000) return '12m';
  if (hz >= 28000000 && hz <= 29700000) return '10m';
  if (hz >= 50000000 && hz <= 54000000) return '6m';
  if (hz >= 144000000 && hz <= 148000000) return '2m';
  if (hz >= 420000000 && hz <= 450000000) return '70cm';
  return 'Unknown';
}

export function isValidFrequency(hz: number): boolean {
  return hz > 0 && hz <= 1000000000; // 1 GHz max
}

// Power formatting
export function formatPower(watts: number): string {
  return `${watts}W`;
}

// Signal strength formatting
export function formatSignalStrength(dbm: number): string {
  return `${dbm.toFixed(1)} dBm`;
}

// SWR formatting
export function formatSWR(swr: number): string {
  return `${swr.toFixed(1)}:1`;
}

// Duration formatting
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Validation utilities
export function isValidCallsign(callsign: string): boolean {
  const callsignRegex = /^[A-Z0-9]{1,3}[0-9][A-Z0-9]{0,3}[A-Z]$/;
  return callsignRegex.test(callsign.toUpperCase());
}

export function isValidGridSquare(grid: string): boolean {
  const gridRegex = /^[A-R]{2}[0-9]{2}([A-X]{2})?$/;
  return gridRegex.test(grid.toUpperCase());
}

// Color utilities for spectrum
export function dbToColor(db: number, colorMap: string = 'viridis'): string {
  const normalized = Math.max(0, Math.min(1, (db + 120) / 60));
  
  switch (colorMap) {
    case 'viridis':
      return viridisColor(normalized);
    case 'plasma':
      return plasmaColor(normalized);
    case 'inferno':
      return infernoColor(normalized);
    default:
      return viridisColor(normalized);
  }
}

function viridisColor(t: number): string {
  const r = Math.round(255 * (0.267 + 0.005 * t + 0.322 * t * t));
  const g = Math.round(255 * (0.004 + 0.396 * t + 0.154 * t * t));
  const b = Math.round(255 * (0.329 + 0.718 * t - 0.572 * t * t));
  return `rgb(${r}, ${g}, ${b})`;
}

function plasmaColor(t: number): string {
  const r = Math.round(255 * (0.050 + 0.839 * t));
  const g = Math.round(255 * (0.030 + 0.718 * t - 0.372 * t * t));
  const b = Math.round(255 * (0.527 + 0.166 * t - 0.482 * t * t));
  return `rgb(${r}, ${g}, ${b})`;
}

function infernoColor(t: number): string {
  const r = Math.round(255 * (0.001 + 0.998 * t));
  const g = Math.round(255 * (0.002 + 0.855 * t - 0.328 * t * t));
  const b = Math.round(255 * (0.016 + 0.735 * t - 0.645 * t * t));
  return `rgb(${r}, ${g}, ${b})`;
}
