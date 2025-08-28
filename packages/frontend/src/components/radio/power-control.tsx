import React from 'react';
import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useRadioPower, useRadioConnected, useRadioStore } from '@/stores/radio';
import { formatPower } from '@/lib/utils';
import { cn } from '@/lib/utils';

const powerPresets = [
  { value: 5, label: '5W' },
  { value: 10, label: '10W' },
  { value: 25, label: '25W' },
  { value: 50, label: '50W' },
  { value: 100, label: '100W' },
];

export function PowerControl() {
  const power = useRadioPower();
  const connected = useRadioConnected();
  const { setPower } = useRadioStore();

  const handlePowerChange = (value: number[]) => {
    setPower(value[0]);
  };

  const handlePresetPower = (presetPower: number) => {
    setPower(presetPower);
  };

  const getPowerColor = (powerLevel: number) => {
    if (powerLevel <= 10) return 'text-green-600';
    if (powerLevel <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPowerLevel = (powerLevel: number) => {
    if (powerLevel <= 10) return 'QRP';
    if (powerLevel <= 50) return 'Low';
    if (powerLevel <= 100) return 'Medium';
    return 'High';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Power Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Power Display */}
        <div className="text-center">
          <div className={cn(
            "text-3xl font-bold font-mono",
            connected ? getPowerColor(power) : "text-muted-foreground"
          )}>
            {formatPower(power)}
          </div>
          <div className="text-sm text-muted-foreground">
            {getPowerLevel(power)} Power
          </div>
        </div>

        {/* Power Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Power Level</span>
            <span className="font-mono">{power}W</span>
          </div>
          
          <Slider
            value={[power]}
            onValueChange={handlePowerChange}
            max={100}
            min={1}
            step={1}
            disabled={!connected}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1W</span>
            <span>25W</span>
            <span>50W</span>
            <span>100W</span>
          </div>
        </div>

        {/* Power Presets */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">Quick Settings</div>
          <div className="grid grid-cols-5 gap-1">
            {powerPresets.map((preset) => (
              <Button
                key={preset.value}
                variant={power === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetPower(preset.value)}
                disabled={!connected}
                className={cn(
                  "text-xs font-medium",
                  power === preset.value && "bg-primary text-primary-foreground"
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Power Information */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Power Information</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              Current Setting: <span className="font-medium text-foreground">{formatPower(power)}</span>
            </div>
            <div>
              Power Level: <span className={cn("font-medium", getPowerColor(power))}>
                {getPowerLevel(power)}
              </span>
            </div>
            <div>
              Efficiency: <span className="font-medium text-foreground">
                {power <= 10 ? 'Maximum' : power <= 50 ? 'High' : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Power Safety Warning */}
        {power > 50 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900 dark:border-yellow-800">
            <div className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ High power setting - ensure proper antenna and cooling
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
