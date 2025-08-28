import React from 'react';
import { Radio, Power, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FrequencyControl } from '@/components/radio/frequency-control';
import { ModeControl } from '@/components/radio/mode-control';
import { PowerControl } from '@/components/radio/power-control';
import { VFOControl } from '@/components/radio/vfo-control';
import { RadioStatus } from '@/components/radio/radio-status';
import { RadioInfo } from '@/components/radio/radio-info';
import { useRadioStore, useRadioConnected } from '@/stores/radio';
import { useSettings } from '@/stores/ui';
import { toast } from '@/stores/ui';
import { cn } from '@/lib/utils';

export function RadioControlPanel() {
  const { connect, disconnect } = useRadioStore();
  const connected = useRadioConnected();
  const settings = useSettings();

  const handleConnect = async () => {
    try {
      await connect();
      toast.success('Radio Connected', 'Successfully connected to radio');
    } catch (error) {
      toast.error('Connection Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info('Radio Disconnected', 'Radio connection closed');
  };

  return (
    <div className="space-y-6">
      {/* Radio Control Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Radio Control
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
                {connected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            
            <div className="flex gap-2">
              {connected ? (
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                >
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              ) : (
                <Button 
                  onClick={handleConnect}
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Primary Controls */}
        <div className="space-y-6">
          <FrequencyControl />
          <ModeControl />
          <PowerControl />
        </div>

        {/* Right Column - Secondary Controls */}
        <div className="space-y-6">
          <VFOControl />
          <RadioStatus />
          <RadioInfo />
        </div>
      </div>

      {/* Spectrum Display (if enabled) */}
      {settings.showSpectrum && (
        <Card>
          <CardHeader>
            <CardTitle>Spectrum Display</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Radio className="h-8 w-8 mx-auto mb-2" />
                <div className="text-sm">Mini spectrum display</div>
                <div className="text-xs">Switch to Spectrum panel for full view</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
