import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAudioInputMeterLevel, useAudioOutputMeterLevel } from '@/stores/audio-new';
import { cn } from '@/lib/utils';

interface AudioLevelMeterProps {
  type: 'input' | 'output';
}

export function AudioLevelMeter({ type }: AudioLevelMeterProps) {
  const inputMeterLevel = useAudioInputMeterLevel();
  const outputMeterLevel = useAudioOutputMeterLevel();

  const [realTimeLevel, setRealTimeLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);

  // Get METER levels (not volume controls!)
  const meterLevel = type === 'input' ? inputMeterLevel : outputMeterLevel;

  // Real-time audio level monitoring from meter levels
  useEffect(() => {
    // Use METER level (signal measurement), NOT volume control
    const level = Math.min(meterLevel || 0, 1); // Clamp to 0-1
    setRealTimeLevel(level);

    // Update peak hold
    setPeakLevel(prev => Math.max(prev * 0.95, level));
  }, [meterLevel]);

  // Level meters are READ-ONLY displays, not controls!

  const getLevelColor = (level: number) => {
    if (level < 30) return 'bg-green-500';
    if (level < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLevelBars = (level: number) => {
    return Math.floor((level / 100) * 20); // 20 bars max
  };

  const getIcon = () => {
    if (type === 'input') {
      return <Mic className="h-4 w-4" />;
    } else {
      return <Volume2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Level Control Slider */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
          {getIcon()}
        </div>
        
        <div className="flex-1">
          {/* Level meters are READ-only displays */}
          <div className="text-sm text-muted-foreground">
            Level meters show signal strength only
          </div>
        </div>

      </div>

      {/* Visual Level Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Level</span>
          <span>Peak: {peakLevel.toFixed(0)}%</span>
        </div>
        
        <div className="flex gap-1 h-4 bg-muted rounded overflow-hidden">
          {Array.from({ length: 20 }, (_, i) => {
            const barLevel = (i + 1) * 5; // Each bar represents 5%
            const isActive = realTimeLevel >= barLevel;
            const isPeak = peakLevel >= barLevel && peakLevel < barLevel + 5;
            
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 transition-all duration-75",
                  isActive ? getLevelColor(barLevel) : "bg-muted-foreground/20",
                  isPeak && "bg-white"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Digital Level Display */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Current:</span>
          <span className={cn(
            "font-mono font-bold",
            realTimeLevel > 80 ? "text-red-600" : 
            realTimeLevel > 60 ? "text-yellow-600" : "text-green-600"
          )}>
            {realTimeLevel.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Signal:</span>
          <span className="font-mono font-medium text-foreground">
            {Math.round(realTimeLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Level Warnings */}
      {realTimeLevel > 90 && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          ⚠️ Level too high - may cause distortion
        </div>
      )}
      
      {realTimeLevel < 0.1 && realTimeLevel > 0 && (
        <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
          ⚠️ Level very low - check connections
        </div>
      )}
      

    </div>
  );
}
