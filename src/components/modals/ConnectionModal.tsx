import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (host: string, port: number) => Promise<void>;
  connecting: boolean;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  connecting
}) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('4532');
  const [error, setError] = useState<string | null>(null);

  const presets = [
    { 
      name: 'Local Development', 
      host: 'localhost', 
      port: 4532,
      description: 'rigctld running on this machine'
    },
    { 
      name: 'Raspberry Pi', 
      host: 'raspberrypi.local', 
      port: 4532,
      description: 'Default Pi hostname'
    },
    { 
      name: 'Custom Network', 
      host: '192.168.1.100', 
      port: 4532,
      description: 'Enter your own IP address'
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await onConnect(host, parseInt(port));
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    setHost(preset.host);
    setPort(preset.port.toString());
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
      title="Connect to rigctld"
      size="md"
      closeOnOverlayClick={!connecting}
      closeOnEscape={!connecting}
      showCloseButton={!connecting}
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Connect to rigctld running on your Raspberry Pi or other device to control your radio.</p>
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
                    {preset.host}:{preset.port}
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
              label="Hostname or IP Address"
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="e.g., raspberrypi.local or 192.168.1.100"
              disabled={connecting}
              required
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              }
            />

            <Input
              label="Port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="4532"
              min="1"
              max="65535"
              disabled={connecting}
              required
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
                disabled={!host || !port}
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
              <li>• Make sure rigctld is running: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">rigctld -m 229 -r /dev/ttyUSB0</code></li>
              <li>• Check firewall settings on the target device</li>
              <li>• Use IP address if hostname doesn't resolve</li>
              <li>• Default rigctld port is 4532</li>
            </ul>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectionModal;
