import React from 'react';
import { Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { useAudioStore, useAudioConnected, useAudioOutputLevel, useAudioMuted } from '@/stores/audio';
import { cn } from '@/lib/utils';

export function MiniAudioControl() {
  const audioStore = useAudioStore();
  const connected = useAudioConnected();
  const outputLevel = useAudioOutputLevel();
  const muted = useAudioMuted();

  const handleStartAudio = async () => {
    try {
      await audioStore.startAudio();
    } catch (error) {
      console.error('Failed to start audio:', error);
    }
  };

  const handleStopAudio = async () => {
    try {
      await audioStore.stopAudio();
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  };

  if (!connected) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <VolumeX className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Audio Stopped</span>
            </div>
            <Button size="sm" onClick={handleStartAudio}>
              Start Audio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Radio Audio</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleStopAudio}>
              Stop
            </Button>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Volume</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => audioStore.setMuted(!muted)}
                  className="h-6 w-6 p-0"
                >
                  {muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                </Button>
                <span className="text-xs text-muted-foreground w-8">{Math.round(outputLevel)}%</span>
              </div>
            </div>
            <Slider
              value={[outputLevel]}
              onValueChange={([value]) => audioStore.setOutputLevel(value)}
              max={100}
              step={1}
              className="w-full"
              disabled={muted}
            />
          </div>

          {/* Status */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>RX: Active</span>
            <span>TX: Ready</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
