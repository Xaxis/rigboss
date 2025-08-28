import React from 'react';
import { BarChart3, Maximize2, Eye, Zap, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useSpectrumSettings, useSpectrumSource, useSpectrumMode, useSpectrumStore } from '@/stores/spectrum';
import { formatFrequency } from '@/lib/utils';
import type { SpectrumSource, SpectrumMode } from '@/types';

const dataSources: { value: SpectrumSource; label: string; description: string }[] = [
  { value: 'AUTO', label: 'Auto', description: 'Auto-detect best source' },
  { value: 'IF', label: 'IF', description: 'Intermediate Frequency' },
  { value: 'IQ', label: 'IQ', description: 'In-phase/Quadrature' },
  { value: 'PCM', label: 'PCM', description: 'Audio PCM (fallback)' },
];

const displayModes: { value: SpectrumMode; label: string; description: string }[] = [
  { value: 'spectrum', label: 'Spectrum Only', description: 'Show spectrum plot only' },
  { value: 'waterfall', label: 'Waterfall Only', description: 'Show waterfall only' },
  { value: 'combined', label: 'Combined', description: 'Spectrum + waterfall' },
];

const spanPresets = [
  { value: 10000, label: '10 kHz' },
  { value: 25000, label: '25 kHz' },
  { value: 50000, label: '50 kHz' },
  { value: 100000, label: '100 kHz' },
  { value: 250000, label: '250 kHz' },
  { value: 500000, label: '500 kHz' },
  { value: 1000000, label: '1 MHz' },
];

export function SpectrumControls() {
  const settings = useSpectrumSettings();
  const source = useSpectrumSource();
  const mode = useSpectrumMode();
  const { updateSettings, setSource, setMode, setFullscreen } = useSpectrumStore();

  const handleCenterFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) * 1000000; // Convert MHz to Hz
    if (!isNaN(value)) {
      updateSettings({ centerHz: value });
    }
  };

  const handleSpanChange = (spanHz: number) => {
    updateSettings({ spanHz });
  };

  const handleRefLevelChange = (value: number[]) => {
    updateSettings({ refLevel: value[0] });
  };

  const handleFFTSizeChange = (fftSize: string) => {
    updateSettings({ fftSize: parseInt(fftSize) });
  };

  const handleAveragingChange = (value: number[]) => {
    updateSettings({ averaging: value[0] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Display Mode</label>
          <Select value={mode} onValueChange={(value: SpectrumMode) => setMode(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayModes.map((mode) => (
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

        {/* Data Source */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Source</label>
          <Select value={source} onValueChange={(value: SpectrumSource) => setSource(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dataSources.map((src) => (
                <SelectItem key={src.value} value={src.value}>
                  <div>
                    <div className="font-medium">{src.label}</div>
                    <div className="text-xs text-muted-foreground">{src.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Center Frequency */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Center Frequency</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.001"
              value={(settings.centerHz / 1000000).toFixed(3)}
              onChange={handleCenterFrequencyChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <span className="text-sm text-muted-foreground">MHz</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Current: {formatFrequency(settings.centerHz)}
          </div>
        </div>

        {/* Span */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Span</label>
          <div className="grid grid-cols-2 gap-1">
            {spanPresets.map((preset) => (
              <Button
                key={preset.value}
                variant={settings.spanHz === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleSpanChange(preset.value)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">
            Current: {formatFrequency(settings.spanHz)}
          </div>
        </div>

        {/* Reference Level */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Reference Level</label>
          <div className="px-2">
            <Slider
              value={[settings.refLevel]}
              onValueChange={handleRefLevelChange}
              max={20}
              min={-100}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-100 dB</span>
            <span className="font-medium text-foreground">{settings.refLevel} dB</span>
            <span>+20 dB</span>
          </div>
        </div>

        {/* FFT Size */}
        <div className="space-y-2">
          <label className="text-sm font-medium">FFT Size</label>
          <Select value={settings.fftSize.toString()} onValueChange={handleFFTSizeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="512">512</SelectItem>
              <SelectItem value="1024">1024</SelectItem>
              <SelectItem value="2048">2048</SelectItem>
              <SelectItem value="4096">4096</SelectItem>
              <SelectItem value="8192">8192</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground">
            Higher values = better resolution, slower updates
          </div>
        </div>

        {/* Averaging */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Averaging</label>
          <div className="px-2">
            <Slider
              value={[settings.averaging]}
              onValueChange={handleAveragingChange}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 (None)</span>
            <span className="font-medium text-foreground">{settings.averaging}</span>
            <span>10 (Heavy)</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Actions</label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Reset to default settings
                updateSettings({
                  centerHz: 14200000,
                  spanHz: 100000,
                  refLevel: 0,
                  fftSize: 2048,
                  averaging: 3,
                });
              }}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Reset View
            </Button>
          </div>
        </div>

        {/* Status Info */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Status</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Source: <span className="font-medium text-foreground">{source}</span></div>
            <div>Mode: <span className="font-medium text-foreground">{mode}</span></div>
            <div>Resolution: <span className="font-medium text-foreground">
              {(settings.spanHz / settings.fftSize / 1000).toFixed(1)} kHz/bin
            </span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
