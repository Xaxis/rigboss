import React from 'react';
import { Info, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRadioModel, useRadioSerialNumber, useRadioFirmwareVersion, useRadioConnected } from '@/stores/radio';
import { cn } from '@/lib/utils';

export function RadioInfo() {
  const model = useRadioModel();
  const serialNumber = useRadioSerialNumber();
  const firmwareVersion = useRadioFirmwareVersion();
  const connected = useRadioConnected();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Radio Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <>
            {/* Radio Model */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Model</div>
              <div className="text-sm font-medium text-foreground">
                {model || 'Unknown'}
              </div>
            </div>

            {/* Serial Number */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Serial</div>
              <div className="text-sm font-mono text-foreground">
                {serialNumber || 'N/A'}
              </div>
            </div>

            {/* Firmware Version */}
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-muted-foreground">Firmware</div>
              <div className="text-sm font-mono text-foreground">
                {firmwareVersion || 'N/A'}
              </div>
            </div>

            {/* Additional Info */}
            <div className="pt-2 border-t border-border">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Connection</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocol</span>
                  <span className="font-medium text-foreground">Hamlib/rigctl</span>
                </div>
                <div className="flex justify-between">
                  <span>Interface</span>
                  <span className="font-medium text-foreground">USB/Serial</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <div className="text-sm font-medium text-muted-foreground mb-1">
              No Radio Connected
            </div>
            <div className="text-xs text-muted-foreground">
              Connect to radio to view information
            </div>
          </div>
        )}

        {/* Radio Capabilities (when connected) */}
        {connected && model && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-2">Capabilities</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>• Frequency Control</div>
              <div>• Mode Selection</div>
              <div>• Power Control</div>
              <div>• VFO Operations</div>
              <div>• PTT Control</div>
              {model.includes('7300') && (
                <>
                  <div>• Spectrum Scope</div>
                  <div>• Waterfall Display</div>
                  <div>• Digital IF Output</div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
