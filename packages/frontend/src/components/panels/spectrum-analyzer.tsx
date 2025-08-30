import React, { useEffect } from 'react';
import { BarChart3, Maximize2, Settings, Eye, EyeOff, ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SpectrumCanvas } from '@/components/spectrum/spectrum-canvas';
import { SpectrumControls } from '@/components/spectrum/spectrum-controls';
import { SpectrumSettings } from '@/components/spectrum/spectrum-settings';
import { useSpectrumStore, useSpectrumConnected, useSpectrumFullscreen } from '@/stores/spectrum';
import { useSettings } from '@/stores/ui';
import { toast } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function SpectrumAnalyzerPanel() {
  const { autoDetectSource, setConnected } = useSpectrumStore();
  const connected = useSpectrumConnected();
  const fullscreen = useSpectrumFullscreen();
  const settings = useSettings();
  const [showSettings, setShowSettings] = React.useState(false);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(true);

  useEffect(() => {
    // Initialize spectrum via WebSocket-only settings; backend selects best source
    if (!connected) {
      import('@/services/websocket').then(({ getWebSocketService }) => {
        const ws = getWebSocketService();
        ws.emit('spectrum:settings:set', { source: 'AUTO' });
      });
    }
  }, [connected]);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Spectrum Analyzer - Fullscreen</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => useSpectrumStore.getState().setFullscreen(false)}
              >
                Exit Fullscreen
              </Button>
            </div>
          </div>
          
          <div className="flex-1 flex">
            <div className="flex-1">
              <SpectrumCanvas />
            </div>
            {showSettings && (
              <div className="w-80 border-l border-border p-4 overflow-y-auto">
                <SpectrumSettings />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Spectrum Analyzer Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Spectrum Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                connected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  connected ? 'bg-green-500' : 'bg-red-500'
                )} />
                {connected ? 'Active' : 'Offline'}
              </div>
              
              <div className="text-sm text-muted-foreground">
                Real-time RF spectrum analysis with waterfall display
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => useSpectrumStore.getState().setFullscreen(true)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
              >
                {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main spectrum display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <SpectrumCanvas />
            </CardContent>
          </Card>
        </div>
        
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          rightPanelOpen ? "block" : "hidden"
        )}>
          <div className="space-y-4">
            <SpectrumControls />
            {showSettings && <SpectrumSettings />}
          </div>
        </div>
      </div>

      {/* Spectrum Information */}
      <Card>
        <CardHeader>
          <CardTitle>Spectrum Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Data Source</div>
              <div className="font-mono">Auto-detected (IF/IQ preferred)</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Resolution</div>
              <div className="font-mono">2048 FFT bins</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Update Rate</div>
              <div className="font-mono">~30 FPS</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
