import React from 'react';
import { Settings, Monitor, Wifi, Volume2, Database, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useSettings, useUIStore } from '@/stores/ui';
import { updateProxyConfig, validateBackendUrl, discoverBackends } from '@/lib/config';
import { toast } from '@/stores/ui';
import { cn } from '@/lib/utils';
import type { Theme } from '@/types';

export function SettingsPanel() {
  const settings = useSettings();
  const { updateSettings, resetSettings } = useUIStore();
  const [backendUrlInput, setBackendUrlInput] = React.useState(settings.backendUrl);
  const [isValidating, setIsValidating] = React.useState(false);
  const [discoveredBackends, setDiscoveredBackends] = React.useState<string[]>([]);

  const handleThemeChange = (theme: Theme) => {
    updateSettings({ theme });
  };

  const handleBackendUrlChange = async () => {
    if (backendUrlInput === settings.backendUrl) return;

    setIsValidating(true);
    try {
      const isValid = await validateBackendUrl(backendUrlInput);
      if (isValid) {
        updateSettings({ backendUrl: backendUrlInput });
        updateProxyConfig(backendUrlInput);
        toast.success('Backend Updated', 'Backend URL updated successfully');
      } else {
        toast.error('Invalid Backend', 'Could not connect to the specified backend URL');
      }
    } catch (error) {
      toast.error('Validation Failed', 'Failed to validate backend URL');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDiscoverBackends = async () => {
    try {
      const backends = await discoverBackends();
      setDiscoveredBackends(backends);
      if (backends.length > 0) {
        toast.success('Discovery Complete', `Found ${backends.length} backend(s)`);
      } else {
        toast.info('No Backends Found', 'No backends discovered on local network');
      }
    } catch (error) {
      toast.error('Discovery Failed', 'Failed to discover backends');
    }
  };

  const handleResetSettings = () => {
    resetSettings();
    setBackendUrlInput(settings.backendUrl);
    toast.info('Settings Reset', 'All settings restored to defaults');
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Configure RigBoss application preferences and backend connections
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Monitor className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <Select value={settings.theme} onValueChange={handleThemeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Show Spectrum Display</div>
              <div className="text-xs text-muted-foreground">
                Show mini spectrum in radio panel
              </div>
            </div>
            <Switch
              checked={settings.showSpectrum}
              onCheckedChange={(checked) => updateSettings({ showSpectrum: checked })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Spectrum Position</label>
            <Select 
              value={settings.spectrumPosition} 
              onValueChange={(value: 'top' | 'bottom') => updateSettings({ spectrumPosition: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Backend Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wifi className="h-5 w-5" />
            Backend Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Backend URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder="http://localhost:3001"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button
                onClick={handleBackendUrlChange}
                disabled={isValidating || backendUrlInput === settings.backendUrl}
              >
                {isValidating ? 'Validating...' : 'Update'}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Current: {settings.backendUrl}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Auto Connect</div>
              <div className="text-xs text-muted-foreground">
                Connect to backend on startup
              </div>
            </div>
            <Switch
              checked={settings.autoConnect}
              onCheckedChange={(checked) => updateSettings({ autoConnect: checked })}
            />
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={handleDiscoverBackends}
              className="w-full"
            >
              Discover Backends on Network
            </Button>
            
            {discoveredBackends.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Discovered Backends:</div>
                {discoveredBackends.map((url) => (
                  <Button
                    key={url}
                    variant="outline"
                    size="sm"
                    onClick={() => setBackendUrlInput(url)}
                    className="w-full text-left justify-start"
                  >
                    {url}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5" />
            Audio Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Auto Start Audio</div>
              <div className="text-xs text-muted-foreground">
                Start audio system automatically
              </div>
            </div>
            <Switch
              checked={settings.audioAutoStart}
              onCheckedChange={(checked) => updateSettings({ audioAutoStart: checked })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Toast Position</label>
            <Select 
              value={settings.toastPosition} 
              onValueChange={(value: any) => updateSettings({ toastPosition: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-right">Top Right</SelectItem>
                <SelectItem value="top-left">Top Left</SelectItem>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Station Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Station Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Callsign</label>
              <input
                type="text"
                value={settings.callsign}
                onChange={(e) => updateSettings({ callsign: e.target.value.toUpperCase() })}
                placeholder="W1AW"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grid Square</label>
              <input
                type="text"
                value={settings.grid}
                onChange={(e) => updateSettings({ grid: e.target.value.toUpperCase() })}
                placeholder="FN31pr"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">QTH</label>
              <input
                type="text"
                value={settings.qth}
                onChange={(e) => updateSettings({ qth: e.target.value })}
                placeholder="City, State"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Antenna Info</label>
              <input
                type="text"
                value={settings.antennaInfo}
                onChange={(e) => updateSettings({ antennaInfo: e.target.value })}
                placeholder="Dipole @ 30ft"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reset Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium">Reset to Defaults</div>
              <div className="text-xs text-muted-foreground">
                Restore all settings to their default values
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleResetSettings}
            >
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
