import React from 'react';
import { Play, Square, Mic, TestTube, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CollapsibleInfo, InfoItem } from '@/components/ui/collapsible-info';
import { useAudioRecording, useAudioPlaying, useAudioConnected, useAudioStore } from '@/stores/audio';
import { toast } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function AudioControls() {
  const recording = useAudioRecording();
  const playing = useAudioPlaying();
  const connected = useAudioConnected();
  const { startRecording, stopRecording, testAudio } = useAudioStore();

  const handleStartRecording = async () => {
    try {
      await startRecording();
      toast.success('Recording Started', 'Audio recording is now active');
    } catch (error) {
      toast.error('Recording Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleStopRecording = async () => {
    try {
      await stopRecording();
      toast.info('Recording Stopped', 'Audio recording has been stopped');
    } catch (error) {
      toast.error('Stop Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleTestAudio = async () => {
    try {
      await testAudio();
      toast.success('Audio Test', 'Test tone played successfully');
    } catch (error) {
      toast.error('Test Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Audio Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Recording Control */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Recording</label>
            {recording ? (
              <Button
                variant="destructive"
                onClick={handleStopRecording}
                disabled={!connected}
                className="w-full flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            ) : (
              <Button
                onClick={handleStartRecording}
                disabled={!connected}
                className="w-full flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            )}
          </div>

          {/* Audio Test */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Audio</label>
            <Button
              variant="outline"
              onClick={handleTestAudio}
              disabled={!connected || playing}
              className="w-full flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              {playing ? 'Playing...' : 'Test Tone'}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Actions</label>
            <Button
              variant="outline"
              onClick={() => {
                // Reset audio levels to defaults
                useAudioStore.getState().setInputLevel(50);
                useAudioStore.getState().setOutputLevel(75);
                useAudioStore.getState().setMuted(false);
                toast.info('Audio Reset', 'Audio levels reset to defaults');
              }}
              disabled={!connected}
              className="w-full flex items-center gap-2"
            >
              <Volume2 className="h-4 w-4" />
              Reset Levels
            </Button>
          </div>
        </div>

        {/* Status Information */}
        <CollapsibleInfo title="Audio Status" defaultOpen={false}>
          <InfoItem
            label="Connection"
            value={connected ? 'Active' : 'Inactive'}
            valueClassName={connected ? "text-green-600" : "text-red-600"}
          />
          <InfoItem
            label="Recording"
            value={recording ? 'Recording' : 'Standby'}
            valueClassName={recording ? "text-blue-600" : "text-muted-foreground"}
          />
          <InfoItem
            label="Playback"
            value={playing ? 'Playing' : 'Ready'}
            valueClassName={playing ? "text-purple-600" : "text-muted-foreground"}
          />
        </CollapsibleInfo>

        {/* Recording Status */}
        {recording && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Recording in progress...
              </div>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Audio is being captured and processed
            </div>
          </div>
        )}

        {/* Audio Test Status */}
        {playing && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg dark:bg-purple-900 dark:border-purple-800">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <div className="text-sm font-medium text-purple-800 dark:text-purple-200">
                Playing test tone...
              </div>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-300 mt-1">
              1 kHz test tone at 10% volume
            </div>
          </div>
        )}

        {/* Connection Warning */}
        {!connected && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900 dark:border-yellow-800">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              ⚠️ Audio system not active
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
              Click "Start Audio" to enable audio controls
            </div>
          </div>
        )}

        {/* Control Instructions */}
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <div>• Use recording to capture audio from microphone</div>
          <div>• Test tone verifies audio output functionality</div>
          <div>• Reset levels restores default audio settings</div>
        </div>
      </CardContent>
    </Card>
  );
}
