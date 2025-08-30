import React from 'react';
import { Button } from '@/components/ui/button';
import { useSpectrumStore } from '@/stores/spectrum';
import { 
  Maximize2, 
  Minimize2, 
  Settings, 
  Grid, 
  Activity,
  Radio,
  Target,
  X
} from 'lucide-react';

interface SpectrumToolbarProps {
  variant: 'normal' | 'fullscreen';
  controlPanelOpen?: boolean;
  onToggleControlPanel?: () => void;
  onFullscreen?: () => void;
  onExitFullscreen?: () => void;
}

export function SpectrumToolbar({
  variant,
  controlPanelOpen,
  onToggleControlPanel,
  onFullscreen,
  onExitFullscreen
}: SpectrumToolbarProps) {
  const { settings, mode, updateSettings, setMode } = useSpectrumStore();

  const handleGridToggle = () => {
    updateSettings({ showGrid: !settings.showGrid });
  };

  const handleModeToggle = () => {
    const modes = ['spectrum', 'waterfall', 'combined'] as const;
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  const handleCouplingToggle = () => {
    updateSettings({ coupled: !settings.coupled });
  };

  return (
    <div className="flex items-center justify-between p-2 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Left Side - Mode Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={settings.showGrid ? "default" : "outline"}
          size="sm"
          onClick={handleGridToggle}
          className="flex items-center gap-1"
        >
          <Grid className="h-3 w-3" />
          Grid
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleModeToggle}
          className="flex items-center gap-1"
        >
          <Activity className="h-3 w-3" />
          {mode === 'spectrum' ? 'Spectrum' : mode === 'waterfall' ? 'Waterfall' : 'Combined'}
        </Button>

        <Button
          variant={settings.coupled ? "default" : "outline"}
          size="sm"
          onClick={handleCouplingToggle}
          className="flex items-center gap-1"
        >
          <Radio className="h-3 w-3" />
          {settings.coupled ? 'Coupled' : 'Manual'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => updateSettings({ traceMode: 'live' })}
          className="flex items-center gap-1"
        >
          <Target className="h-3 w-3" />
          Clear
        </Button>
      </div>

      {/* Center - Title */}
      <div className="flex-1 text-center">
        <h3 className="text-sm font-medium">
          {variant === 'fullscreen' ? 'Spectrum Analyzer - Fullscreen' : 'Spectrum Analyzer'}
        </h3>
      </div>

      {/* Right Side - View Controls */}
      <div className="flex items-center gap-2">
        {variant === 'normal' && onToggleControlPanel && (
          <Button
            variant={controlPanelOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleControlPanel}
            className="flex items-center gap-1"
          >
            <Settings className="h-3 w-3" />
            Controls
          </Button>
        )}

        {variant === 'fullscreen' && onToggleControlPanel && (
          <Button
            variant={controlPanelOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleControlPanel}
            className="flex items-center gap-1"
          >
            <Settings className="h-3 w-3" />
            Panel
          </Button>
        )}

        {variant === 'normal' && onFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFullscreen}
            className="flex items-center gap-1"
          >
            <Maximize2 className="h-3 w-3" />
            Full
          </Button>
        )}

        {variant === 'fullscreen' && onExitFullscreen && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExitFullscreen}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Exit
          </Button>
        )}
      </div>
    </div>
  );
}
