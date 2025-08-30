import React from 'react';
import { Info, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsibleInfo, InfoItem } from '@/components/ui/collapsible-info';
import { useRadioConnected, useRadioStore } from '@/stores/radio';
import { cn } from '@/lib/utils';

export function RadioInfo() {
  const { rigModel, serialNumber, firmwareVersion, rigInfo } = useRadioStore();
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
                {rigModel || 'Unknown'}
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
              <CollapsibleInfo title="Connection Details" defaultOpen={false}>
                <InfoItem
                  label="Connection"
                  value="Active"
                  valueClassName="text-green-600"
                />
                <InfoItem
                  label="Protocol"
                  value="Hamlib/rigctl"
                />
                <InfoItem
                  label="Interface"
                  value="USB/Serial"
                />
              </CollapsibleInfo>
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
        {connected && rigModel && (
          <CollapsibleInfo title="Radio Capabilities" defaultOpen={false}>
            <div className="space-y-1">
              <div>• Frequency Control</div>
              <div>• Mode Selection</div>
              <div>• Power Control</div>
              <div>• VFO Operations</div>
              <div>• PTT Control</div>
              {rigModel?.includes('7300') && (
                <>
                  <div>• Spectrum Scope</div>
                  <div>• Waterfall Display</div>
                  <div>• Digital IF Output</div>
                </>
              )}
            </div>
          </CollapsibleInfo>
        )}
      </CardContent>
    </Card>
  );
}
