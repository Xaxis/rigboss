import React, { useEffect } from 'react';
import { SpectrumAnalyzer } from '@/components/spectrum/spectrum-analyzer';

export function SpectrumAnalyzerPanel() {
  useEffect(() => {
    // Initialize spectrum via WebSocket-only settings; backend selects best source
    let unsub: (() => void) | null = null;
    import('@/services/websocket').then(({ getWebSocketService }) => {
      const ws = getWebSocketService();
      const sendInit = () => ws.emit('spectrum:settings:set', { source: 'AUTO' });
      if (ws.isConnected()) {
        sendInit();
      } else {
        unsub = ws.subscribe('connection_state', (st: any) => {
          if (st?.connected) {
            sendInit();
            unsub?.();
          }
        });
      }
    });
    return () => { unsub?.(); };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Spectrum Analyzer</h2>
        <p className="text-muted-foreground">
          Professional RF spectrum and waterfall display
        </p>
      </div>

      {/* Main Analyzer */}
      <SpectrumAnalyzer variant="full" height={500} />
    </div>
  );
}
