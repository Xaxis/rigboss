import React from 'react';
import { RadioControlPanel } from '@/components/panels/radio-control';
import { SpectrumAnalyzerPanel } from '@/components/panels/spectrum-analyzer';
import { AudioSystemPanel } from '@/components/panels/audio-system';
import { MemoryManagementPanel } from '@/components/panels/memory-management';
import { LoggingPanel } from '@/components/panels/logging';
import { SettingsPanel } from '@/components/panels/settings';
import { useActivePanel } from '@/stores/ui';
import type { Panel } from '@/types';

export function PanelRouter() {
  const activePanel = useActivePanel();

  const renderPanel = (panel: Panel) => {
    switch (panel) {
      case 'radio':
        return <RadioControlPanel />;
      case 'spectrum':
        return <SpectrumAnalyzerPanel />;
      case 'audio':
        return <AudioSystemPanel />;
      case 'memory':
        return <MemoryManagementPanel />;
      case 'log':
        return <LoggingPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <RadioControlPanel />;
    }
  };

  return (
    <div className="w-full">
      {renderPanel(activePanel)}
    </div>
  );
}
