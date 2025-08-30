import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSpectrumStore } from '@/stores/spectrum';
import { useRadioStore } from '@/stores/radio';
import { SpectrumDisplay } from './spectrum-display';
import { SpectrumControlPanel } from './spectrum-control-panel';
import { SpectrumToolbar } from './spectrum-toolbar';
import { SpectrumStatusBar } from './spectrum-status-bar';
import { useResizeObserver } from '@/hooks/use-resize-observer';
import { cn } from '@/lib/utils';

interface SpectrumAnalyzerProps {
  className?: string;
  variant?: 'full' | 'mini' | 'embedded';
  height?: number;
  showControls?: boolean;
}

export function SpectrumAnalyzer({ 
  className, 
  variant = 'full', 
  height = 500,
  showControls = true 
}: SpectrumAnalyzerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Store state
  const { 
    frame, 
    settings, 
    mode, 
    meta, 
    connected,
    fullscreen,
    updateSettings,
    setMode,
    setFullscreen 
  } = useSpectrumStore();
  
  const radioFreq = useRadioStore((s) => s.frequencyHz);

  // Responsive behavior
  const isWideScreen = dimensions.width >= 1200;
  const shouldShowControlPanel = showControls && variant === 'full' && isWideScreen && controlPanelOpen;
  const displayWidth = shouldShowControlPanel ? dimensions.width - 320 : dimensions.width;

  // Handle container resize
  useResizeObserver(containerRef, (entry) => {
    setDimensions({
      width: entry.contentRect.width,
      height: entry.contentRect.height
    });
  });

  // Auto-collapse control panel on narrow screens
  useEffect(() => {
    if (!isWideScreen && controlPanelOpen) {
      setControlPanelOpen(false);
    }
  }, [isWideScreen, controlPanelOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case 'f':
          if (variant === 'full') setFullscreen(true);
          break;
        case 'c':
          if (variant === 'full') setControlPanelOpen(!controlPanelOpen);
          break;
        case 'r':
          // Reset view to radio frequency
          updateSettings({
            centerHz: radioFreq || 14200000,
            spanHz: 100000,
            refLevel: 0
          });
          break;
        case '1':
          setMode('spectrum');
          break;
        case '2':
          setMode('waterfall');
          break;
        case '3':
          setMode('combined');
          break;
        case 'g':
          // Toggle grid
          updateSettings({ showGrid: !settings.showGrid });
          break;
        case 'Escape':
          if (fullscreen) setFullscreen(false);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant, radioFreq, updateSettings, setMode, setFullscreen, fullscreen, controlPanelOpen, settings.showGrid]);

  // Fullscreen mode
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <SpectrumToolbar 
          variant="fullscreen"
          onExitFullscreen={() => setFullscreen(false)}
          controlPanelOpen={controlPanelOpen}
          onToggleControlPanel={() => setControlPanelOpen(!controlPanelOpen)}
        />
        
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <SpectrumStatusBar meta={meta} connected={connected} />
            <div className="flex-1">
              <SpectrumDisplay
                frame={frame}
                settings={settings}
                mode={mode}
                radioFreq={radioFreq}
                variant="fullscreen"
                width={controlPanelOpen ? window.innerWidth - 320 : window.innerWidth}
                height={window.innerHeight - 120}
              />
            </div>
          </div>
          
          {controlPanelOpen && (
            <div className="w-80 border-l border-border bg-card">
              <SpectrumControlPanel variant="fullscreen" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const analyzerHeight = variant === 'mini' ? 200 : height;

  return (
    <div 
      ref={containerRef}
      className={cn("spectrum-analyzer flex flex-col", className)}
      style={{ height: analyzerHeight }}
      tabIndex={0}
    >
      {/* Toolbar */}
      {variant === 'full' && (
        <SpectrumToolbar 
          variant="normal"
          controlPanelOpen={controlPanelOpen}
          onToggleControlPanel={() => setControlPanelOpen(!controlPanelOpen)}
          onFullscreen={() => setFullscreen(true)}
        />
      )}

      {/* Status Bar */}
      {variant !== 'mini' && (
        <SpectrumStatusBar meta={meta} connected={connected} compact={variant === 'embedded'} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Display Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <SpectrumDisplay
            frame={frame}
            settings={settings}
            mode={mode}
            radioFreq={radioFreq}
            variant={variant}
            width={displayWidth}
            height={analyzerHeight - (variant === 'mini' ? 0 : 80)}
          />
        </div>

        {/* Control Panel */}
        {shouldShowControlPanel && (
          <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm">
            <SpectrumControlPanel variant="sidebar" />
          </div>
        )}
      </div>

      {/* Mobile Control Panel */}
      {showControls && variant === 'full' && !isWideScreen && controlPanelOpen && (
        <div className="border-t border-border bg-card p-4 max-h-60 overflow-y-auto">
          <SpectrumControlPanel variant="mobile" />
        </div>
      )}

      {/* Unavailable Overlay */}
      {!connected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-lg font-semibold text-white">Spectrum Unavailable</div>
            <div className="text-sm text-muted-foreground mt-1">
              {meta?.device ? `Device: ${meta.device}` : 'No capture device detected'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
