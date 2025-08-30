import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSpectrumStore } from '@/stores/spectrum';
import { useRadioStore } from '@/stores/radio';
import { formatFrequency } from '@/lib/utils';
import { Radio, Target, Grid, Palette, Activity, Settings2 } from 'lucide-react';
import type { SpectrumMode, SpectrumTraceMode } from '@/types';

interface SpectrumControlPanelProps {
  variant: 'sidebar' | 'mobile' | 'fullscreen';
}

const spanPresets = [
  { value: 1000, label: '1 kHz' },
  { value: 2000, label: '2 kHz' },
  { value: 5000, label: '5 kHz' },
  { value: 10000, label: '10 kHz' },
  { value: 25000, label: '25 kHz' },
  { value: 50000, label: '50 kHz' },
  { value: 100000, label: '100 kHz' },
  { value: 250000, label: '250 kHz' },
  { value: 500000, label: '500 kHz' },
  { value: 1000000, label: '1 MHz' },
  { value: 2000000, label: '2 MHz' },
  { value: 5000000, label: '5 MHz' },
];

const fftSizes = [
  { value: 512, label: '512' },
  { value: 1024, label: '1024' },
  { value: 2048, label: '2048' },
  { value: 4096, label: '4096' },
  { value: 8192, label: '8192' },
];

const displayModes: { value: SpectrumMode; label: string }[] = [
  { value: 'spectrum', label: 'Spectrum Only' },
  { value: 'waterfall', label: 'Waterfall Only' },
  { value: 'combined', label: 'Combined View' },
];

const traceModes: { value: SpectrumTraceMode; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'max_hold', label: 'Max Hold' },
  { value: 'average', label: 'Average' },
  { value: 'peak_hold', label: 'Peak Hold' },
];

const colorMaps = [
  { value: 'viridis', label: 'Viridis' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'turbo', label: 'Turbo' },
];

const spectrumColors = [
  { value: '#00ff41', label: 'Green' },
  { value: '#00d4ff', label: 'Cyan' },
  { value: '#ff6b35', label: 'Orange' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#ff00ff', label: 'Magenta' },
  { value: '#ffffff', label: 'White' },
];

export function SpectrumControlPanel({ variant }: SpectrumControlPanelProps) {
  const {
    settings,
    mode,
    updateSettings,
    setMode
  } = useSpectrumStore();
  
  const radioFreq = useRadioStore((s) => s.frequencyHz);

  const handleCenterFreqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) * 1000000; // MHz to Hz
    if (!isNaN(value) && value > 0) {
      updateSettings({ centerHz: value });
    }
  };

  const handleSpanChange = (spanHz: number) => {
    updateSettings({ spanHz });
  };

  const handleCenterOnRadio = () => {
    if (radioFreq) {
      updateSettings({ centerHz: radioFreq });
    }
  };

  const handleResetView = () => {
    updateSettings({
      centerHz: radioFreq || 14200000,
      spanHz: 100000,
      refLevel: 0,
      averaging: 3,
      fftSize: 2048,
      traceMode: 'live',
      showGrid: true,
      autoScale: false,
    });
  };

  const isMobile = variant === 'mobile';
  const CardComponent = isMobile ? 'div' : Card;
  const CardHeaderComponent = isMobile ? 'div' : CardHeader;
  const CardContentComponent = isMobile ? 'div' : CardContent;

  return (
    <div className={`space-y-4 ${isMobile ? 'grid grid-cols-2 gap-4' : ''}`}>
      {/* Frequency Controls */}
      <CardComponent>
        {!isMobile && (
          <CardHeaderComponent className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Frequency
            </CardTitle>
          </CardHeaderComponent>
        )}
        <CardContentComponent className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {isMobile && <div className="font-medium text-sm">Frequency</div>}
          
          {/* Center Frequency */}
          <div className="space-y-2">
            <Label className="text-xs">Center (MHz)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.001"
                value={(settings.centerHz / 1000000).toFixed(6)}
                onChange={handleCenterFreqChange}
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCenterOnRadio}
                disabled={!radioFreq}
                className="shrink-0"
              >
                <Radio className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Span Presets */}
          <div className="space-y-2">
            <Label className="text-xs">Span</Label>
            <div className="grid grid-cols-3 gap-1">
              {spanPresets.slice(0, isMobile ? 6 : 12).map((preset) => (
                <Button
                  key={preset.value}
                  variant={settings.spanHz === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSpanChange(preset.value)}
                  className="text-xs h-7"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContentComponent>
      </CardComponent>

      {/* Display Controls */}
      <CardComponent>
        {!isMobile && (
          <CardHeaderComponent className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Display
            </CardTitle>
          </CardHeaderComponent>
        )}
        <CardContentComponent className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {isMobile && <div className="font-medium text-sm">Display</div>}
          
          {/* Display Mode */}
          <div className="space-y-2">
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={(value: SpectrumMode) => setMode(value)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trace Mode */}
          <div className="space-y-2">
            <Label className="text-xs">Trace</Label>
            <Select 
              value={settings.traceMode} 
              onValueChange={(value: SpectrumTraceMode) => updateSettings({ traceMode: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {traceModes.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Level */}
          <div className="space-y-2">
            <Label className="text-xs">Reference Level (dB)</Label>
            <div className="px-2">
              <Slider
                value={[settings.refLevel]}
                onValueChange={(value) => updateSettings({ refLevel: value[0] })}
                max={20}
                min={-100}
                step={5}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-100</span>
              <span className="font-medium text-foreground">{settings.refLevel} dB</span>
              <span>+20</span>
            </div>
          </div>
        </CardContentComponent>
      </CardComponent>

      {/* Appearance Controls */}
      <CardComponent>
        {!isMobile && (
          <CardHeaderComponent className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Appearance
            </CardTitle>
          </CardHeaderComponent>
        )}
        <CardContentComponent className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {isMobile && <div className="font-medium text-sm">Appearance</div>}
          
          {/* Grid Toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Grid</Label>
            <Switch
              checked={settings.showGrid}
              onCheckedChange={(checked) => updateSettings({ showGrid: checked })}
            />
          </div>

          {/* Spectrum Color */}
          <div className="space-y-2">
            <Label className="text-xs">Spectrum Color</Label>
            <Select 
              value={settings.spectrumColor} 
              onValueChange={(value) => updateSettings({ spectrumColor: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spectrumColors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Waterfall Color Map */}
          <div className="space-y-2">
            <Label className="text-xs">Waterfall Palette</Label>
            <Select 
              value={settings.colorMap} 
              onValueChange={(value) => updateSettings({ colorMap: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorMaps.map((map) => (
                  <SelectItem key={map.value} value={map.value}>
                    {map.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Waterfall Speed */}
          <div className="space-y-2">
            <Label className="text-xs">Waterfall Speed</Label>
            <div className="px-2">
              <Slider
                value={[settings.waterfallSpeed]}
                onValueChange={(value) => updateSettings({ waterfallSpeed: value[0] })}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slow</span>
              <span className="font-medium text-foreground">{settings.waterfallSpeed}x</span>
              <span>Fast</span>
            </div>
          </div>
        </CardContentComponent>
      </CardComponent>

      {/* Processing Controls */}
      <CardComponent>
        {!isMobile && (
          <CardHeaderComponent className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Processing
            </CardTitle>
          </CardHeaderComponent>
        )}
        <CardContentComponent className={isMobile ? 'space-y-3' : 'space-y-4'}>
          {isMobile && <div className="font-medium text-sm">Processing</div>}
          
          {/* FFT Size */}
          <div className="space-y-2">
            <Label className="text-xs">FFT Size</Label>
            <Select 
              value={settings.fftSize.toString()} 
              onValueChange={(value) => updateSettings({ fftSize: parseInt(value) })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fftSizes.map((size) => (
                  <SelectItem key={size.value} value={size.value.toString()}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Averaging */}
          <div className="space-y-2">
            <Label className="text-xs">Averaging</Label>
            <div className="px-2">
              <Slider
                value={[settings.averaging]}
                onValueChange={(value) => updateSettings({ averaging: value[0] })}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Off</span>
              <span className="font-medium text-foreground">{settings.averaging}</span>
              <span>Heavy</span>
            </div>
          </div>

          {/* Coupling */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Couple to Radio</Label>
            <Switch
              checked={settings.coupled}
              onCheckedChange={(checked) => updateSettings({ coupled: checked })}
            />
          </div>

          {/* Auto Scale */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Auto Scale</Label>
            <Switch
              checked={settings.autoScale}
              onCheckedChange={(checked) => updateSettings({ autoScale: checked })}
            />
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <Label className="text-xs">Quick Actions</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetView}
                className="flex items-center gap-1 h-7"
              >
                <Target className="h-3 w-3" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateSettings({ traceMode: 'live' })}
                className="flex items-center gap-1 h-7"
              >
                <Activity className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        </CardContentComponent>
      </CardComponent>
    </div>
  );
}
