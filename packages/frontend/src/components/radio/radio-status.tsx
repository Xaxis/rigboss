import React from 'react';
import { Activity, Mic, MicOff, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRadioPTT, useRadioTuning, useRadioSWR, useRadioSignalStrength, useRadioConnected, useRadioStore } from '@/stores/radio';
import { formatSWR, formatSignalStrength } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function RadioStatus() {
  const ptt = useRadioPTT();
  const tuning = useRadioTuning();
  const swr = useRadioSWR();
  const signalStrength = useRadioSignalStrength();
  const connected = useRadioConnected();
  const { setPTT, setTuning } = useRadioStore();

  const handlePTTToggle = () => {
    setPTT(!ptt);
  };

  const handleTuneToggle = () => {
    setTuning(!tuning);
  };

  const getSWRColor = (swrValue: number) => {
    if (swrValue <= 1.5) return 'text-green-600';
    if (swrValue <= 2.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSWRStatus = (swrValue: number) => {
    if (swrValue <= 1.5) return 'Excellent';
    if (swrValue <= 2.0) return 'Good';
    if (swrValue <= 3.0) return 'Fair';
    return 'Poor';
  };

  const getSignalColor = (dbm: number) => {
    if (dbm >= -60) return 'text-green-600';
    if (dbm >= -80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalBars = (dbm: number) => {
    if (dbm >= -60) return 5;
    if (dbm >= -70) return 4;
    if (dbm >= -80) return 3;
    if (dbm >= -90) return 2;
    return 1;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Radio Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PTT and Tune Controls */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={ptt ? "destructive" : "outline"}
            onClick={handlePTTToggle}
            disabled={!connected}
            className={cn(
              "flex items-center gap-2 font-medium",
              ptt && "bg-red-600 hover:bg-red-700"
            )}
          >
            {ptt ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {ptt ? 'TX' : 'PTT'}
          </Button>
          
          <Button
            variant={tuning ? "default" : "outline"}
            onClick={handleTuneToggle}
            disabled={!connected}
            className={cn(
              "flex items-center gap-2 font-medium",
              tuning && "bg-blue-600 hover:bg-blue-700"
            )}
          >
            <Zap className="h-4 w-4" />
            {tuning ? 'Tuning...' : 'Tune'}
          </Button>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3">
          {/* SWR */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">SWR</div>
            <div className="text-right">
              <div className={cn("font-mono font-bold", getSWRColor(swr))}>
                {formatSWR(swr)}
              </div>
              <div className="text-xs text-muted-foreground">
                {getSWRStatus(swr)}
              </div>
            </div>
          </div>

          {/* Signal Strength */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Signal</div>
            <div className="text-right">
              <div className={cn("font-mono font-bold", getSignalColor(signalStrength))}>
                {formatSignalStrength(signalStrength)}
              </div>
              <div className="flex gap-1 justify-end mt-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-3 rounded-sm",
                      i < getSignalBars(signalStrength)
                        ? getSignalColor(signalStrength).replace('text-', 'bg-')
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Status Alerts */}
        {ptt && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900 dark:border-red-800">
            <div className="text-xs text-red-800 dark:text-red-200 font-medium">
              🔴 TRANSMITTING - PTT Active
            </div>
          </div>
        )}

        {tuning && (
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900 dark:border-blue-800">
            <div className="text-xs text-blue-800 dark:text-blue-200 font-medium">
              🔧 TUNING - Antenna tuner active
            </div>
          </div>
        )}

        {swr > 2.0 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900 dark:border-yellow-800">
            <div className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ HIGH SWR - Check antenna connection
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm font-medium mb-2">Status Summary</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>
              Mode: <span className="font-medium text-foreground">
                {ptt ? 'Transmit' : 'Receive'}
              </span>
            </div>
            <div>
              Antenna: <span className={cn("font-medium", getSWRColor(swr))}>
                {getSWRStatus(swr)} ({formatSWR(swr)})
              </span>
            </div>
            <div>
              Signal: <span className={cn("font-medium", getSignalColor(signalStrength))}>
                {getSignalBars(signalStrength)}/5 bars
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
