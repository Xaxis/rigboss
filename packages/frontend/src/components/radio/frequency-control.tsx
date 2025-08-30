import React, { useState } from 'react';
import { Zap, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRadioConnected, useRadioStore } from '@/stores/radio';
import { formatFrequency, parseFrequency, getFrequencyBand, isValidFrequency } from '@/lib/utils';
import { cn } from '@/lib/utils';

const stepSizes = [
  { value: 1, label: '1 Hz' },
  { value: 10, label: '10 Hz' },
  { value: 100, label: '100 Hz' },
  { value: 1000, label: '1 kHz' },
  { value: 10000, label: '10 kHz' },
  { value: 100000, label: '100 kHz' },
];

const bandPresets = [
  { name: '160m', frequency: 1900000 },
  { name: '80m', frequency: 3750000 },
  { name: '60m', frequency: 5368500 },
  { name: '40m', frequency: 7150000 },
  { name: '30m', frequency: 10125000 },
  { name: '20m', frequency: 14200000 },
  { name: '17m', frequency: 18118000 },
  { name: '15m', frequency: 21225000 },
  { name: '12m', frequency: 24940000 },
  { name: '10m', frequency: 28850000 },
  { name: '6m', frequency: 52000000 },
  { name: '2m', frequency: 146000000 },
];

export function FrequencyControl() {
  const { setFrequency, frequencyHz } = useRadioStore();
  const connected = useRadioConnected();
  const [stepSize, setStepSize] = useState(1000);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const currentBand = getFrequencyBand(frequencyHz || 0);

  const handleFrequencyChange = (newFrequency: number) => {
    if (isValidFrequency(newFrequency)) {
      setFrequency(newFrequency);
    }
  };

  const handleStepUp = () => {
    handleFrequencyChange((frequencyHz || 0) + stepSize);
  };

  const handleStepDown = () => {
    handleFrequencyChange((frequencyHz || 0) - stepSize);
  };

  const handleDirectInput = () => {
    setInputValue(formatFrequency(frequencyHz || 0));
    setIsEditing(true);
  };

  const handleInputSubmit = () => {
    const newFrequency = parseFrequency(inputValue);
    if (newFrequency > 0) {
      handleFrequencyChange(newFrequency);
    }
    setIsEditing(false);
    setInputValue('');
  };

  const handleInputCancel = () => {
    setIsEditing(false);
    setInputValue('');
  };

  const handleBandSelect = (bandFrequency: number) => {
    handleFrequencyChange(bandFrequency);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Frequency Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Frequency Display */}
        <div className="text-center">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInputSubmit();
                  if (e.key === 'Escape') handleInputCancel();
                }}
                className="text-3xl font-mono text-center bg-background border border-input rounded px-2 py-1 w-full"
                placeholder="Enter frequency..."
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={handleInputSubmit}>Apply</Button>
                <Button size="sm" variant="outline" onClick={handleInputCancel}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDirectInput}
              disabled={!connected}
              className={cn(
                "text-3xl font-mono font-bold transition-colors",
                connected 
                  ? "text-foreground hover:text-primary cursor-pointer" 
                  : "text-muted-foreground cursor-not-allowed"
              )}
            >
              {formatFrequency(frequencyHz || 0)}
            </button>
          )}
          
          <div className="text-sm text-muted-foreground mt-1">
            Band: <span className="font-medium text-foreground">{currentBand}</span>
          </div>
        </div>

        {/* Step Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleStepDown}
            disabled={!connected}
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <Select 
              value={stepSize.toString()} 
              onValueChange={(value) => setStepSize(parseInt(value))}
              disabled={!connected}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stepSizes.map((step) => (
                  <SelectItem key={step.value} value={step.value.toString()}>
                    {step.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleStepUp}
            disabled={!connected}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Band Presets */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Quick Bands</div>
          <div className="grid grid-cols-4 gap-1">
            {bandPresets.map((band) => (
              <Button
                key={band.name}
                variant="outline"
                size="sm"
                onClick={() => handleBandSelect(band.frequency)}
                disabled={!connected}
                className="text-xs"
              >
                {band.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Frequency Info */}
        <div className="text-xs text-muted-foreground text-center">
          Click frequency to edit directly • Use +/- for stepping
        </div>
      </CardContent>
    </Card>
  );
}
