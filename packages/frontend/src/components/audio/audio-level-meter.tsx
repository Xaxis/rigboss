import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAudioInputLevel, useAudioOutputLevel, useAudioMuted, useAudioStore } from '@/stores/audio';
import { cn } from '@/lib/utils';

interface AudioLevelMeterProps {
  type: 'input' | 'output';
}

export function AudioLevelMeter({ type }: AudioLevelMeterProps) {
  const inputLevel = useAudioInputLevel();
  const outputLevel = useAudioOutputLevel();
  const muted = useAudioMuted();
  const { setInputLevel, setOutputLevel, setMuted } = useAudioStore();
  
  const [realTimeLevel, setRealTimeLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const animationRef = useRef<number>();

  const level = type === 'input' ? inputLevel : outputLevel;
  const setLevel = type === 'input' ? setInputLevel : setOutputLevel;

  // Simulate real-time audio level monitoring
  useEffect(() => {
    const updateLevels = () => {
      // Simulate audio level fluctuation
      const baseLevel = level / 100;
      const variation = (Math.random() - 0.5) * 0.3;
      const newLevel = Math.max(0, Math.min(1, baseLevel + variation));
      
      setRealTimeLevel(newLevel * 100);
      
      // Update peak hold
      setPeakLevel(prev => Math.max(prev * 0.95, newLevel * 100));
      
      animationRef.current = requestAnimationFrame(updateLevels);
    };

    if (level > 0) {
      updateLevels();
    } else {
      setRealTimeLevel(0);
      setPeakLevel(0);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [level]);

  const handleLevelChange = (value: number[]) => {
    setLevel(value[0]);
  };

  const handleMuteToggle = () => {
    setMuted(!muted);
  };

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
      return muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />;
    } else {
      return muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Level Control Slider */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handleMuteToggle}
          className={cn(
            "flex-shrink-0",
            muted && "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400"
          )}
        >
          {getIcon()}
        </Button>
        
        <div className="flex-1">
          <Slider
            value={[level]}
            onValueChange={handleLevelChange}
            max={100}
            min={0}
            step={1}
            disabled={muted}
            className="w-full"
          />
        </div>
        
        <div className="text-sm font-mono w-12 text-right">
          {level}%
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
          <span className="text-muted-foreground">Set:</span>
          <span className="font-mono font-medium text-foreground">
            {level}%
          </span>
        </div>
      </div>

      {/* Level Warnings */}
      {realTimeLevel > 90 && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          ⚠️ Level too high - may cause distortion
        </div>
      )}
      
      {realTimeLevel < 10 && level > 0 && (
        <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
          ⚠️ Level very low - check connections
        </div>
      )}
      
      {muted && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          🔇 Audio muted
        </div>
      )}
    </div>
  );
}
