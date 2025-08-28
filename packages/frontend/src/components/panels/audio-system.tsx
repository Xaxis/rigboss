import React, { useEffect } from 'react';
import { Volume2, Mic, MicOff, Play, Square, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { AudioDeviceSelector } from '@/components/audio/audio-device-selector';
import { AudioLevelMeter } from '@/components/audio/audio-level-meter';
import { AudioControls } from '@/components/audio/audio-controls';
import { AudioProcessing } from '@/components/audio/audio-processing';
import { useAudioStore, useAudioConnected, useAudioRecording, useAudioPlaying } from '@/stores/audio';
import { useSettings } from '@/stores/ui';
import { toast } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function AudioSystemPanel() {
  const { refreshDevices, startAudio, stopAudio } = useAudioStore();
  const connected = useAudioConnected();
  const recording = useAudioRecording();
  const playing = useAudioPlaying();
  const settings = useSettings();

  useEffect(() => {
    // Refresh audio devices on mount
    refreshDevices().catch((error) => {
      console.error('Failed to refresh audio devices:', error);
      toast.error('Audio Error', 'Failed to access audio devices');
    });
  }, [refreshDevices]);

  useEffect(() => {
    // Auto-start audio if enabled in settings
    if (settings.audioAutoStart && !connected) {
      handleStartAudio();
    }
  }, [settings.audioAutoStart, connected]);

  const handleStartAudio = async () => {
    try {
      await startAudio();
      toast.success('Audio Started', 'Audio system is now active');
    } catch (error) {
      toast.error('Audio Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleStopAudio = () => {
    stopAudio();
    toast.info('Audio Stopped', 'Audio system deactivated');
  };

  return (
    <div className="space-y-6">
      {/* Audio System Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio System
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
                {connected ? 'Active' : 'Inactive'}
              </div>
              
              <div className="text-sm text-muted-foreground">
                Professional audio I/O for ham radio operations
              </div>
            </div>
            
            <div className="flex gap-2">
              {connected ? (
                <Button 
                  variant="outline" 
                  onClick={handleStopAudio}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Audio
                </Button>
              ) : (
                <Button 
                  onClick={handleStartAudio}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Audio
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Audio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radio Audio Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                📡 Radio Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Audio from radio to computer speakers/headphones
              </div>
              
              {/* Radio Audio Output Device */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Output Device (Radio → Computer)</label>
                <ErrorBoundary>
                  <AudioDeviceSelector type="output" />
                </ErrorBoundary>
              </div>
              
              {/* Radio Audio Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Radio Audio Level</label>
                <AudioLevelMeter type="output" />
              </div>
              
              {/* Radio Audio Status */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Radio Audio Status</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Status: <span className={cn(
                    "font-medium",
                    connected ? "text-green-600" : "text-red-600"
                  )}>
                    {connected ? 'Receiving' : 'No Signal'}
                  </span></div>
                  <div>Quality: <span className="font-medium text-foreground">
                    {connected ? 'Good' : 'N/A'}
                  </span></div>
                  <div>Latency: <span className="font-medium text-foreground">
                    {connected ? '< 10ms' : 'N/A'}
                  </span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Computer Audio Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                🎤 Computer Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Audio from computer microphone to radio
              </div>
              
              {/* Computer Audio Input Device */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Device (Computer → Radio)</label>
                <ErrorBoundary>
                  <AudioDeviceSelector type="input" />
                </ErrorBoundary>
              </div>
              
              {/* Computer Audio Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Microphone Level</label>
                <AudioLevelMeter type="input" />
              </div>
              
              {/* Computer Audio Status */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">Computer Audio Status</div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Status: <span className={cn(
                    "font-medium",
                    connected ? "text-green-600" : "text-red-600"
                  )}>
                    {connected ? 'Ready' : 'No Input'}
                  </span></div>
                  <div>Recording: <span className={cn(
                    "font-medium",
                    recording ? "text-blue-600" : "text-muted-foreground"
                  )}>
                    {recording ? 'Active' : 'Standby'}
                  </span></div>
                  <div>Processing: <span className="font-medium text-foreground">
                    {connected ? 'Enabled' : 'Disabled'}
                  </span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audio Controls */}
      <AudioControls />

      {/* Audio Processing */}
      <AudioProcessing />

      {/* Audio Information */}
      <Card>
        <CardHeader>
          <CardTitle>Audio System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Sample Rate</div>
              <div className="font-mono">48 kHz</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Bit Depth</div>
              <div className="font-mono">16-bit</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Channels</div>
              <div className="font-mono">Stereo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
