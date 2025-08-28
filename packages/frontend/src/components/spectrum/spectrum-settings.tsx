import React from 'react';
import { Settings, Palette, Zap, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useSpectrumSettings, useSpectrumStore } from '@/stores/spectrum';

const colorMaps = [
  { value: 'viridis', label: 'Viridis', description: 'Blue to green to yellow' },
  { value: 'plasma', label: 'Plasma', description: 'Purple to pink to yellow' },
  { value: 'inferno', label: 'Inferno', description: 'Black to red to yellow' },
  { value: 'turbo', label: 'Turbo', description: 'Blue to red rainbow' },
  { value: 'grayscale', label: 'Grayscale', description: 'Black to white' },
];

export function SpectrumSettings() {
  const settings = useSpectrumSettings();
  const { updateSettings } = useSpectrumStore();
  const [enablePeakHold, setEnablePeakHold] = React.useState(false);
  const [enableMarkers, setEnableMarkers] = React.useState(true);
  const [enableGrid, setEnableGrid] = React.useState(true);
  const [waterfallSpeed, setWaterfallSpeed] = React.useState(50);
  const [noiseFloor, setNoiseFloor] = React.useState(-90);

  const handleColorMapChange = (colorMap: string) => {
    updateSettings({ colorMap });
  };

  const handlePeakHoldChange = (enabled: boolean) => {
    setEnablePeakHold(enabled);
    // TODO: Implement peak hold functionality
  };

  const handleMarkersChange = (enabled: boolean) => {
    setEnableMarkers(enabled);
    // TODO: Implement markers functionality
  };

  const handleGridChange = (enabled: boolean) => {
    setEnableGrid(enabled);
    // TODO: Implement grid toggle functionality
  };

  const handleWaterfallSpeedChange = (value: number[]) => {
    setWaterfallSpeed(value[0]);
    // TODO: Implement waterfall speed control
  };

  const handleNoiseFloorChange = (value: number[]) => {
    setNoiseFloor(value[0]);
    // TODO: Implement noise floor adjustment
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          Advanced Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Map */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Color Map
          </label>
          <Select value={settings.colorMap} onValueChange={handleColorMapChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorMaps.map((colorMap) => (
                <SelectItem key={colorMap.value} value={colorMap.value}>
                  <div>
                    <div className="font-medium">{colorMap.label}</div>
                    <div className="text-xs text-muted-foreground">{colorMap.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Display Options */}
        <div className="space-y-4">
          <label className="text-sm font-medium">Display Options</label>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm">Peak Hold</div>
              <div className="text-xs text-muted-foreground">
                Hold maximum values
              </div>
            </div>
            <Switch
              checked={enablePeakHold}
              onCheckedChange={handlePeakHoldChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm">Frequency Markers</div>
              <div className="text-xs text-muted-foreground">
                Show frequency markers
              </div>
            </div>
            <Switch
              checked={enableMarkers}
              onCheckedChange={handleMarkersChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm">Grid Lines</div>
              <div className="text-xs text-muted-foreground">
                Show frequency/dB grid
              </div>
            </div>
            <Switch
              checked={enableGrid}
              onCheckedChange={handleGridChange}
            />
          </div>
        </div>

        {/* Waterfall Settings */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Waterfall Speed</label>
          <div className="px-2">
            <Slider
              value={[waterfallSpeed]}
              onValueChange={handleWaterfallSpeedChange}
              max={100}
              min={10}
              step={5}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Slow</span>
            <span className="font-medium text-foreground">{waterfallSpeed}%</span>
            <span>Fast</span>
          </div>
        </div>

        {/* Signal Processing */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Signal Processing
          </label>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm">Noise Floor</label>
              <div className="px-2 mt-1">
                <Slider
                  value={[noiseFloor]}
                  onValueChange={handleNoiseFloorChange}
                  max={-40}
                  min={-120}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>-120 dB</span>
                <span className="font-medium text-foreground">{noiseFloor} dB</span>
                <span>-40 dB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Settings */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </label>
          
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">Current Settings</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>FFT Size: <span className="font-medium text-foreground">{settings.fftSize}</span></div>
              <div>Averaging: <span className="font-medium text-foreground">{settings.averaging}</span></div>
              <div>Update Rate: <span className="font-medium text-foreground">~30 FPS</span></div>
              <div>Memory Usage: <span className="font-medium text-foreground">~15 MB</span></div>
            </div>
          </div>
        </div>

        {/* Preset Actions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Presets</label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateSettings({
                  fftSize: 4096,
                  averaging: 1,
                  refLevel: 0,
                  colorMap: 'viridis',
                });
                setWaterfallSpeed(75);
                setEnablePeakHold(false);
              }}
            >
              High Resolution
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateSettings({
                  fftSize: 1024,
                  averaging: 5,
                  refLevel: -20,
                  colorMap: 'plasma',
                });
                setWaterfallSpeed(50);
                setEnablePeakHold(true);
              }}
            >
              Weak Signal
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateSettings({
                  fftSize: 2048,
                  averaging: 3,
                  refLevel: 0,
                  colorMap: 'viridis',
                });
                setWaterfallSpeed(50);
                setEnablePeakHold(false);
                setEnableMarkers(true);
                setEnableGrid(true);
              }}
            >
              Default
            </Button>
          </div>
        </div>

        {/* Export/Import */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Configuration</label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Export settings
                console.log('Export settings');
              }}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Import settings
                console.log('Import settings');
              }}
            >
              Import
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
