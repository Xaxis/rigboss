import React from 'react';
import { Headphones, Mic, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAudioInputDevices, useAudioOutputDevices, useAudioSelectedInputDevice, useAudioSelectedOutputDevice, useAudioStore } from '@/stores/audio';
import { cn } from '@/lib/utils';

interface AudioDeviceSelectorProps {
  type: 'input' | 'output';
}

export function AudioDeviceSelector({ type }: AudioDeviceSelectorProps) {
  const inputDevices = useAudioInputDevices();
  const outputDevices = useAudioOutputDevices();
  const selectedInputDevice = useAudioSelectedInputDevice();
  const selectedOutputDevice = useAudioSelectedOutputDevice();
  const { setSelectedInputDevice, setSelectedOutputDevice, refreshDevices } = useAudioStore();

  const devices = type === 'input' ? inputDevices : outputDevices;
  const selectedDevice = type === 'input' ? selectedInputDevice : selectedOutputDevice;
  const setSelectedDevice = type === 'input' ? setSelectedInputDevice : setSelectedOutputDevice;

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDevice(deviceId);
  };

  const handleRefresh = async () => {
    try {
      await refreshDevices();
    } catch (error) {
      console.error('Failed to refresh devices:', error);
    }
  };

  const getDeviceIcon = () => {
    return type === 'input' ? <Mic className="h-4 w-4" /> : <Headphones className="h-4 w-4" />;
  };

  const getDeviceLabel = (device: any) => {
    // Clean up device labels for better display
    let label = device.label;
    if (!label || label === '') {
      label = `${type === 'input' ? 'Microphone' : 'Speaker'} ${device.id.slice(0, 8)}`;
    }
    
    // Remove common prefixes/suffixes
    label = label.replace(/^(Default - |Communications - )/, '');
    label = label.replace(/ \([0-9a-f-]+\)$/, '');
    
    return label;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select value={selectedDevice || ''} onValueChange={handleDeviceChange}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                {getDeviceIcon()}
                <SelectValue placeholder={`Select ${type} device...`} />
              </div>
            </SelectTrigger>
            <SelectContent>
              {devices.length === 0 ? (
                <SelectItem value="" disabled>
                  No {type} devices found
                </SelectItem>
              ) : (
                devices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon()}
                      <div>
                        <div className="font-medium">{getDeviceLabel(device)}</div>
                        {device.groupId && (
                          <div className="text-xs text-muted-foreground">
                            Group: {device.groupId.slice(0, 8)}
                          </div>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          className="flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Device Info */}
      {selectedDevice && (
        <div className="text-xs text-muted-foreground">
          {devices.find(d => d.id === selectedDevice)?.label && (
            <div>Selected: {getDeviceLabel(devices.find(d => d.id === selectedDevice)!)}</div>
          )}
        </div>
      )}
      
      {devices.length === 0 && (
        <div className="text-xs text-yellow-600">
          ⚠️ No {type} devices detected. Check permissions and connections.
        </div>
      )}
    </div>
  );
}
