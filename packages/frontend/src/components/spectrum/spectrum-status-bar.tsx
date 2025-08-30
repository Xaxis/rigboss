import React from 'react';
import type { SpectrumMeta } from '@/types';

interface SpectrumStatusBarProps {
  meta?: SpectrumMeta;
  connected: boolean;
  compact?: boolean;
}

export function SpectrumStatusBar({ meta, connected, compact = false }: SpectrumStatusBarProps) {
  if (!connected) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${compact ? 'p-1' : 'p-2'} border-b border-border bg-card/30`}>
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span className="font-medium">Spectrum Unavailable</span>
        {meta?.device && !compact && <span>• Device: {meta.device}</span>}
      </div>
    );
  }

  const statusItems: string[] = [];
  
  if (meta?.device && !compact) {
    statusItems.push(`Device: ${meta.device}`);
  }
  
  if (meta?.provider && !compact) {
    statusItems.push(`Provider: ${meta.provider}`);
  }
  
  if (typeof meta?.fps === 'number') {
    statusItems.push(`${meta.fps} fps`);
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${compact ? 'p-1' : 'p-2'} border-b border-border bg-card/30`}>
      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
      <span className="font-medium text-foreground">Active</span>
      {statusItems.length > 0 && (
        <>
          <span>•</span>
          <span className="font-mono text-xs">{statusItems.join(' • ')}</span>
        </>
      )}
    </div>
  );
}
