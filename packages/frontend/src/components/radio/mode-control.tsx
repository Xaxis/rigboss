import React from 'react';
import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRadioMode, useRadioConnected, useRadioStore } from '@/stores/radio';
import { cn } from '@/lib/utils';
import type { RadioMode } from '@/types';

const modes: { mode: RadioMode; label: string; description: string }[] = [
  { mode: 'LSB', label: 'LSB', description: 'Lower Sideband' },
  { mode: 'USB', label: 'USB', description: 'Upper Sideband' },
  { mode: 'CW', label: 'CW', description: 'Continuous Wave' },
  { mode: 'CWR', label: 'CW-R', description: 'CW Reverse' },
  { mode: 'AM', label: 'AM', description: 'Amplitude Modulation' },
  { mode: 'FM', label: 'FM', description: 'Frequency Modulation' },
  { mode: 'WFM', label: 'WFM', description: 'Wide FM' },
  { mode: 'RTTY', label: 'RTTY', description: 'Radio Teletype' },
  { mode: 'RTTYR', label: 'RTTY-R', description: 'RTTY Reverse' },
  { mode: 'PSK', label: 'PSK', description: 'Phase Shift Keying' },
  { mode: 'PSKR', label: 'PSK-R', description: 'PSK Reverse' },
];

const commonModes: RadioMode[] = ['LSB', 'USB', 'CW', 'AM', 'FM'];
const digitalModes: RadioMode[] = ['RTTY', 'RTTYR', 'PSK', 'PSKR'];

export function ModeControl() {
  const currentMode = useRadioMode();
  const connected = useRadioConnected();
  const { setMode } = useRadioStore();
  const [showAll, setShowAll] = React.useState(false);

  const handleModeChange = (mode: RadioMode) => {
    setMode(mode);
  };

  const getModeInfo = (mode: RadioMode) => {
    return modes.find(m => m.mode === mode);
  };

  const currentModeInfo = getModeInfo(currentMode);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Mode Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Mode Display */}
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {currentModeInfo?.label || currentMode}
          </div>
          <div className="text-sm text-muted-foreground">
            {currentModeInfo?.description || 'Unknown mode'}
          </div>
        </div>

        {/* Common Modes */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Common Modes</div>
          <div className="grid grid-cols-5 gap-1">
            {commonModes.map((mode) => {
              const modeInfo = getModeInfo(mode);
              const isActive = currentMode === mode;
              
              return (
                <Button
                  key={mode}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange(mode)}
                  disabled={!connected}
                  className={cn(
                    "text-xs font-medium",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                  title={modeInfo?.description}
                >
                  {modeInfo?.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Digital Modes */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Digital Modes</div>
          <div className="grid grid-cols-4 gap-1">
            {digitalModes.map((mode) => {
              const modeInfo = getModeInfo(mode);
              const isActive = currentMode === mode;
              
              return (
                <Button
                  key={mode}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleModeChange(mode)}
                  disabled={!connected}
                  className={cn(
                    "text-xs font-medium",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                  title={modeInfo?.description}
                >
                  {modeInfo?.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Additional Modes Toggle */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs"
          >
            {showAll ? 'Show Less' : 'Show All Modes'}
          </Button>
          
          {showAll && (
            <div className="grid grid-cols-3 gap-1">
              {modes.filter(m => ![...commonModes, ...digitalModes].includes(m.mode)).map((modeInfo) => {
                const isActive = currentMode === modeInfo.mode;
                
                return (
                  <Button
                    key={modeInfo.mode}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleModeChange(modeInfo.mode)}
                    disabled={!connected}
                    className={cn(
                      "text-xs font-medium",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                    title={modeInfo.description}
                  >
                    {modeInfo.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mode Info */}
        <div className="text-xs text-muted-foreground text-center">
          Current: <span className="font-medium text-foreground">{currentModeInfo?.description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
