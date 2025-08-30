import React from 'react';
import { useSpectrumStore } from '@/stores/spectrum';

export function SpectrumStatusBar() {
  const meta = useSpectrumStore((s) => s.meta);
  const connected = useSpectrumStore((s) => s.connected);

  if (!connected) return <span>Unavailable</span>;

  const parts: string[] = [];
  if (meta?.device) parts.push(`device=${meta.device}`);
  if (meta?.provider) parts.push(`provider=${meta.provider}`);
  if (typeof meta?.fps === 'number') parts.push(`${meta.fps} fps`);

  return <span>{parts.join(' · ') || 'Active'}</span>;
}

