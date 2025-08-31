import React, { useEffect, useState } from 'react';
import { Volume2, Mic, MicOff, Play, Square, Settings, Radio, Headphones } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AudioDeviceSelector } from '@/components/audio/audio-device-selector';
import { AudioLevelMeter } from '@/components/audio/audio-level-meter';
import { useAudioControlStore, useAudioConnected, useAudioOutputLevel, useAudioInputLevel, useAudioMuted } from '@/stores/audio-new';
import { useRadioStore } from '@/stores/radio';
import { toast } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function AudioSystemPanel() {
  const audioControlStore = useAudioControlStore();
  const connected = useAudioConnected();
  const outputLevel = useAudioOutputLevel();
  const inputLevel = useAudioInputLevel();
  const muted = useAudioMuted();
  const { ptt } = useRadioStore();

  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    // Refresh audio devices on mount
    audioControlStore.refreshDevices().catch((error) => {
      console.error('Failed to refresh audio devices:', error);
      toast.error('Audio Error', 'Failed to access audio devices');
    });
  }, [audioControlStore]);

  const handleStartAudio = async () => {
    setIsStarting(true);
    try {
      await audioControlStore.startAudio();
      toast.success('Audio Active', 'Radio audio is now streaming');
    } catch (error) {
      toast.error('Audio Failed', error instanceof Error ? error.message : 'Failed to start audio');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopAudio = async () => {
    try {
      audioControlStore.stopAudio();
      toast.info('Audio Stopped', 'Radio audio stopped');
    } catch (error) {
      toast.error('Stop Failed', 'Failed to stop audio');
    }
  };

  return (
    <div className="space-y-6">
      {/* Audio System Status & Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Radio Audio System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                connected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : isStarting
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  connected ? 'bg-green-500' : isStarting ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'
                )} />
                {connected ? 'Audio Active' : isStarting ? 'Connecting...' : 'Audio Stopped'}
              </div>

              <div className="text-sm text-muted-foreground">
                {connected
                  ? 'Radio audio streaming • Microphone ready for PTT'
                  : isStarting
                  ? 'Initializing audio devices and connections...'
                  : 'Start audio to hear your radio and enable microphone'
                }
              </div>
            </div>

            <div className="flex gap-2">
              {connected ? (
                <Button
                  variant="outline"
                  onClick={handleStopAudio}
                  disabled={isStarting}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Audio
                </Button>
              ) : (
                <Button
                  onClick={handleStartAudio}
                  disabled={isStarting}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isStarting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Audio
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audio Controls - Only show when audio is active */}
      {connected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RX Audio Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Radio Audio (RX)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Volume Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Volume</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => audioControlStore.setMuted(!muted)}
                      className="h-8 w-8 p-0"
                    >
                      {muted ? <MicOff className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <span className="text-xs text-muted-foreground w-8">{Math.round(outputLevel)}%</span>
                  </div>
                </div>
                <Slider
                  value={[outputLevel]}
                  onValueChange={([value]) => audioControlStore.setOutputLevel(value)}
                  max={100}
                  step={1}
                  className="w-full"
                  disabled={muted}
                />
              </div>

              {/* Audio Level Meter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Signal Level</label>
                <AudioLevelMeter type="output" />
              </div>

              {/* Device Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Output Device</label>
                <ErrorBoundary>
                  <AudioDeviceSelector type="output" />
                </ErrorBoundary>
              </div>
            </CardContent>
          </Card>

          {/* TX Audio Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Microphone (TX)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Microphone Gain */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Gain</label>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      ptt ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                    )} />
                    <span className="text-xs text-muted-foreground w-8">{Math.round(inputLevel)}%</span>
                  </div>
                </div>
                <Slider
                  value={[inputLevel]}
                  onValueChange={([value]) => audioControlStore.setInputLevel(value)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Audio Level Meter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Level</label>
                <AudioLevelMeter type="input" />
              </div>

              {/* Device Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Device</label>
                <ErrorBoundary>
                  <AudioDeviceSelector type="input" />
                </ErrorBoundary>
              </div>

              {/* PTT Status */}
              <div className={cn(
                'p-3 rounded-lg border',
                ptt
                  ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                  : 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
              )}>
                <div className="text-sm font-medium">
                  {ptt ? '🔴 TRANSMITTING' : '⚪ STANDBY'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ptt ? 'Microphone is active' : 'Press PTT to transmit'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audio Setup Instructions - Only show when audio is stopped */}
      {!connected && !isStarting && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Setup Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                To use ham radio audio with rigboss:
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                  <div>
                    <div className="font-medium">Connect radio audio output</div>
                    <div className="text-muted-foreground">Connect your radio's audio output to your computer's line input or USB audio interface</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</div>
                  <div>
                    <div className="font-medium">Connect microphone for TX</div>
                    <div className="text-muted-foreground">Connect your computer microphone to radio audio input for transmission</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</div>
                  <div>
                    <div className="font-medium">Start audio system</div>
                    <div className="text-muted-foreground">Click "Start Audio" to begin streaming radio audio and enable microphone for PTT</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
