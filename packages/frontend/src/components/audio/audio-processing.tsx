import React from 'react';
import { Cpu, Filter, Zap, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CollapsibleInfo, InfoItem } from '@/components/ui/collapsible-info';
import { cn } from '@/lib/utils';

export function AudioProcessing() {
  const [noiseReduction, setNoiseReduction] = React.useState(true);
  const [echoCancellation, setEchoCancellation] = React.useState(false);
  const [autoGainControl, setAutoGainControl] = React.useState(true);
  const [compressionLevel, setCompressionLevel] = React.useState(30);
  const [equalizerEnabled, setEqualizerEnabled] = React.useState(false);
  const [processingMode, setProcessingMode] = React.useState('voice');

  const processingModes = [
    { value: 'voice', label: 'Voice', description: 'Optimized for voice communication' },
    { value: 'music', label: 'Music', description: 'High fidelity for music/audio' },
    { value: 'data', label: 'Data', description: 'Optimized for digital modes' },
    { value: 'raw', label: 'Raw', description: 'Minimal processing' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu className="h-5 w-5" />
          Audio Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Processing Mode</label>
          <Select value={processingMode} onValueChange={setProcessingMode}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {processingModes.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  <div>
                    <div className="font-medium">{mode.label}</div>
                    <div className="text-xs text-muted-foreground">{mode.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audio Enhancement */}
        <div className="space-y-4">
          <label className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Audio Enhancement
          </label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm">Noise Reduction</div>
                <div className="text-xs text-muted-foreground">
                  Reduce background noise
                </div>
              </div>
              <Switch
                checked={noiseReduction}
                onCheckedChange={setNoiseReduction}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm">Echo Cancellation</div>
                <div className="text-xs text-muted-foreground">
                  Cancel acoustic echo
                </div>
              </div>
              <Switch
                checked={echoCancellation}
                onCheckedChange={setEchoCancellation}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-sm">Auto Gain Control</div>
                <div className="text-xs text-muted-foreground">
                  Automatic level adjustment
                </div>
              </div>
              <Switch
                checked={autoGainControl}
                onCheckedChange={setAutoGainControl}
              />
            </div>
          </div>
        </div>

        {/* Compression */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Audio Compression</label>
          <div className="px-2">
            <Slider
              value={[compressionLevel]}
              onValueChange={(value) => setCompressionLevel(value[0])}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>None</span>
            <span className="font-medium text-foreground">{compressionLevel}%</span>
            <span>Maximum</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Compression helps maintain consistent audio levels
          </div>
        </div>

        {/* Equalizer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Equalizer</label>
            <Switch
              checked={equalizerEnabled}
              onCheckedChange={setEqualizerEnabled}
            />
          </div>
          
          {equalizerEnabled && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <div className="text-xs font-medium text-muted-foreground">Frequency Bands</div>
              <div className="grid grid-cols-5 gap-2">
                {['60Hz', '170Hz', '350Hz', '1kHz', '3.5kHz'].map((freq, index) => (
                  <div key={freq} className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">{freq}</div>
                    <Slider
                      defaultValue={[50]}
                      max={100}
                      min={0}
                      step={5}
                      orientation="vertical"
                      className="h-16 mx-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Processing Status */}
        <CollapsibleInfo title="Processing Status" defaultOpen={false}>
          <InfoItem
            label="Mode"
            value={processingModes.find(m => m.value === processingMode)?.label || 'Unknown'}
          />
          <InfoItem
            label="Noise Reduction"
            value={noiseReduction ? 'Enabled' : 'Disabled'}
            valueClassName={noiseReduction ? "text-green-600" : "text-muted-foreground"}
          />
          <InfoItem
            label="Echo Cancel"
            value={echoCancellation ? 'Enabled' : 'Disabled'}
            valueClassName={echoCancellation ? "text-green-600" : "text-muted-foreground"}
          />
          <InfoItem
            label="Auto Gain"
            value={autoGainControl ? 'Enabled' : 'Disabled'}
            valueClassName={autoGainControl ? "text-green-600" : "text-muted-foreground"}
          />
          <InfoItem
            label="Compression"
            value={`${compressionLevel}%`}
          />
        </CollapsibleInfo>

        {/* Performance Impact */}
        <CollapsibleInfo title="Performance Impact" defaultOpen={false}>
          <InfoItem
            label="CPU Usage"
            value={
              noiseReduction || echoCancellation || equalizerEnabled
                ? 'Medium'
                : 'Low'
            }
            valueClassName={
              noiseReduction || echoCancellation || equalizerEnabled
                ? 'text-yellow-600'
                : 'text-green-600'
            }
          />
          <InfoItem
            label="Memory Usage"
            value="~8 MB"
          />
          <InfoItem
            label="Latency"
            value="< 5ms"
          />
        </CollapsibleInfo>

        {/* Processing Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>• Voice mode optimizes for speech clarity</div>
          <div>• Enable noise reduction in noisy environments</div>
          <div>• Use compression for consistent levels</div>
          <div>• Disable processing for digital modes</div>
        </div>
      </CardContent>
    </Card>
  );
}
