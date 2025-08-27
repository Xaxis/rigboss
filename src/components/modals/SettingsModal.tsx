import React, { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@/contexts/ThemeContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { config, updateConfig } = useAppStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('radio');

  const tabs = [
    { id: 'radio', label: 'Radio', icon: '📻' },
    { id: 'ui', label: 'Interface', icon: '🎨' },
    { id: 'network', label: 'Network', icon: '🌐' },
  ];

  const handleSave = () => {
    // Configuration is automatically saved via Zustand persist
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="lg"
    >
      <div className="flex h-96">
        {/* Tabs */}
        <div className="w-48 border-r border-gray-200 dark:border-gray-700 pr-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 pl-6 overflow-y-auto">
          {activeTab === 'radio' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Radio Configuration</h3>
              
              <Input
                label="rigctld Host"
                value={config.radio.rigctldHost}
                onChange={(e) => updateConfig({
                  radio: { ...config.radio, rigctldHost: e.target.value }
                })}
                placeholder="localhost"
              />
              
              <Input
                label="rigctld Port"
                type="number"
                value={config.radio.rigctldPort.toString()}
                onChange={(e) => updateConfig({
                  radio: { ...config.radio, rigctldPort: parseInt(e.target.value) }
                })}
                placeholder="4532"
              />
              
              <Input
                label="Poll Interval (ms)"
                type="number"
                value={config.radio.pollInterval.toString()}
                onChange={(e) => updateConfig({
                  radio: { ...config.radio, pollInterval: parseInt(e.target.value) }
                })}
                placeholder="1000"
                helperText="How often to poll radio state"
              />
            </div>
          )}



          {activeTab === 'ui' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Interface Settings</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <Input
                label="Frequency Step (Hz)"
                type="number"
                value={config.ui.frequencyStep.toString()}
                onChange={(e) => updateConfig({
                  ui: { ...config.ui, frequencyStep: parseInt(e.target.value) }
                })}
                placeholder="1000"
                helperText="Step size for frequency tuning controls"
              />

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ui.touchOptimized}
                    onChange={(e) => updateConfig({
                      ui: { ...config.ui, touchOptimized: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Touch Optimized Interface</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ui.showSpectrum}
                    onChange={(e) => updateConfig({
                      ui: { ...config.ui, showSpectrum: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Mini Spectrum in Radio Panel</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ui.showWaterfall}
                    onChange={(e) => updateConfig({
                      ui: { ...config.ui, showWaterfall: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Waterfall in Spectrum View</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Network Settings</h3>
              
              <Input
                label="Server Port"
                type="number"
                value={config.network.serverPort.toString()}
                onChange={(e) => updateConfig({
                  network: { ...config.network, serverPort: parseInt(e.target.value) }
                })}
                placeholder="3001"
                helperText="Requires restart to take effect"
              />
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.network.allowRemoteConnections}
                  onChange={(e) => updateConfig({
                    network: { ...config.network, allowRemoteConnections: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Allow Remote Connections</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </Modal>
  );
};

export default SettingsModal;
