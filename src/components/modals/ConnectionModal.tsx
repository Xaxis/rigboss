import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { backendConfig } from '@/utils/backendConfig';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (serverHost: string) => Promise<void>;
  connecting: boolean;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  connecting
}) => {
  const [serverHost, setServerHost] = useState('');
  const [error, setError] = useState<string | null>(null);

  const presets = [
    {
      name: 'Local Development',
      host: 'localhost',
      description: 'Radio server running on this machine'
    },
    {
      name: 'Raspberry Pi',
      host: 'raspberrypi.local',
      description: 'Radio server on Raspberry Pi'
    },
    {
      name: 'Custom Network',
      host: '',
      description: 'Enter your radio server IP'
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!serverHost.trim()) {
      setError('Please enter a server address');
      return;
    }

    // Configure backend to connect to the radio server
    const serverUrl = `http://${serverHost.trim()}:3001`;
    try {
      backendConfig.setBackendUrl(serverUrl);

      // Test backend connection first
      const isReachable = await backendConfig.testConnection();
      if (!isReachable) {
        setError(`Cannot reach radio server at ${serverHost}. Make sure rigboss backend is running.`);
        return;
      }

      // Connect to the radio server (backend will handle rigctld connection)
      await onConnect(serverHost.trim());
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    setServerHost(preset.host);
    setError(null);
  };

  const handleClose = () => {
    if (!connecting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect to Radio Server"
      size="md"
      closeOnOverlayClick={!connecting}
      closeOnEscape={!connecting}
      showCloseButton={!connecting}
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Connect to the radio server running rigboss backend and rigctld.</p>
          <div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            <strong>How it works:</strong> Enter the IP/hostname where rigboss backend is running.
            The backend handles the rigctld connection automatically.
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Quick Connect
          </h3>
          <div className="grid gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset)}
                disabled={connecting}
                className="text-left p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {preset.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {preset.description}
                    </div>
                  </div>
                  <div className="text-sm font-mono text-gray-600 dark:text-gray-300">
                    {preset.host}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Configuration */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Manual Configuration
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Radio Server Address"
              type="text"
              value={serverHost}
              onChange={(e) => setServerHost(e.target.value)}
              placeholder="e.g., 10.0.0.20 or raspberrypi.local"
              disabled={connecting}
              required
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              }
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-sm text-red-700 dark:text-red-200">{error}</span>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={connecting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={connecting}
                disabled={!serverHost}
                className="flex-1"
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <div className="font-medium mb-2">Need help?</div>
            <ul className="space-y-1 text-xs">
              <li>• Make sure rigboss backend is running: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm run dev:backend</code></li>
              <li>• Backend should be running on port 3001</li>
              <li>• Backend handles rigctld connection automatically</li>
              <li>• Use IP address if hostname doesn't resolve</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectionModal;
