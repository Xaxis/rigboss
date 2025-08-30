import React from 'react';
import { RotateCcw, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useRadioConnected, useRadioStore } from '@/stores/radio';
import { cn } from '@/lib/utils';
import type { VFO } from '@/types';

export function VFOControl() {
  const { vfo, split, setVFO, setSplit } = useRadioStore();
  const connected = useRadioConnected();

  const handleVFOChange = (newVFO: string) => {
    setVFO(newVFO);
  };

  const handleSplitToggle = (enabled: boolean) => {
    setSplit(enabled);
  };

  const handleVFOSwap = () => {
    // This would swap VFO A and B frequencies
    // For now, just toggle between VFOA and VFOB
    setVFO(vfo === 'VFOA' ? 'VFOB' : 'VFOA');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5" />
          VFO Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* VFO Selection */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Active VFO</div>
          <div className="flex gap-2">
            <Button
              variant={vfo === 'VFOA' ? "default" : "outline"}
              size="lg"
              onClick={() => handleVFOChange('VFOA')}
              disabled={!connected}
              className={cn(
                "flex-1 text-lg font-bold",
                vfo === 'VFOA' && "bg-primary text-primary-foreground"
              )}
            >
              VFO A
            </Button>
            <Button
              variant={vfo === 'VFOB' ? "default" : "outline"}
              size="lg"
              onClick={() => handleVFOChange('VFOB')}
              disabled={!connected}
              className={cn(
                "flex-1 text-lg font-bold",
                vfo === 'VFOB' && "bg-primary text-primary-foreground"
              )}
            >
              VFO B
            </Button>
          </div>
        </div>

        {/* Split Operation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Split Operation</div>
              <div className="text-xs text-muted-foreground">
                Transmit on different frequency
              </div>
            </div>
            <Switch
              checked={split}
              onCheckedChange={handleSplitToggle}
              disabled={!connected}
            />
          </div>
          
          {split && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-800">
              <div className="text-xs text-blue-800 dark:text-blue-200">
                📡 Split mode active - RX: VFO {vfo}, TX: VFO {vfo === 'A' ? 'B' : 'A'}
              </div>
            </div>
          )}
        </div>

        {/* VFO Operations */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">VFO Operations</div>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              onClick={handleVFOSwap}
              disabled={!connected}
              className="flex items-center gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Swap VFO A ↔ B
            </Button>
          </div>
        </div>

        {/* VFO Status */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">VFO Status</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              Active VFO: <span className="font-medium text-foreground">VFO {vfo}</span>
            </div>
            <div>
              Split Mode: <span className={cn(
                "font-medium",
                split ? "text-blue-600" : "text-muted-foreground"
              )}>
                {split ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {split && (
              <>
                <div>
                  RX VFO: <span className="font-medium text-foreground">VFO {vfo}</span>
                </div>
                <div>
                  TX VFO: <span className="font-medium text-foreground">VFO {vfo === 'A' ? 'B' : 'A'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="text-xs text-muted-foreground text-center">
          Use VFO A/B for different frequencies • Enable split for separate TX/RX
        </div>
      </CardContent>
    </Card>
  );
}
