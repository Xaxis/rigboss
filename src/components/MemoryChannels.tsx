import React, { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import type { MemoryChannel, RadioMode } from '@/types/radio';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

interface MemoryChannelsProps {
  currentFrequency: number;
  currentMode: RadioMode;
  onRecall: (frequency: number, mode: RadioMode) => void;
}

const MemoryChannels: React.FC<MemoryChannelsProps> = ({
  currentFrequency,
  currentMode,
  onRecall,
}) => {
  const { config, updateConfig, addToast } = useAppStore();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveChannelNumber, setSaveChannelNumber] = useState('');
  const [saveChannelName, setSaveChannelName] = useState('');

  // Get memory channels from config (we'll store them there)
  const memoryChannels: MemoryChannel[] = (config as any).memoryChannels || [];

  const handleSaveChannel = () => {
    const channelNum = parseInt(saveChannelNumber);
    if (isNaN(channelNum) || channelNum < 1 || channelNum > 100) {
      addToast({
        type: 'error',
        title: 'Invalid Channel',
        message: 'Channel number must be between 1 and 100',
      });
      return;
    }

    const newChannel: MemoryChannel = {
      number: channelNum,
      name: saveChannelName || `CH${channelNum}`,
      frequency: currentFrequency,
      mode: currentMode,
      bandwidth: 2400, // Default bandwidth
      antenna: 1,
    };

    const updatedChannels = memoryChannels.filter(ch => ch.number !== channelNum);
    updatedChannels.push(newChannel);
    updatedChannels.sort((a, b) => a.number - b.number);

    updateConfig({
      ...config,
      memoryChannels: updatedChannels,
    } as any);

    addToast({
      type: 'success',
      title: 'Memory Saved',
      message: `Channel ${channelNum}: ${newChannel.name}`,
    });

    setShowSaveModal(false);
    setSaveChannelNumber('');
    setSaveChannelName('');
  };

  const handleRecallChannel = (channel: MemoryChannel) => {
    onRecall(channel.frequency, channel.mode);
    addToast({
      type: 'info',
      title: 'Memory Recalled',
      message: `${channel.name}: ${(channel.frequency / 1000000).toFixed(6)} MHz`,
      duration: 2000,
    });
  };

  const handleDeleteChannel = (channelNumber: number) => {
    const updatedChannels = memoryChannels.filter(ch => ch.number !== channelNumber);
    updateConfig({
      ...config,
      memoryChannels: updatedChannels,
    } as any);

    addToast({
      type: 'info',
      title: 'Memory Deleted',
      message: `Channel ${channelNumber} removed`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Memory Channels
        </h3>
        <Button
          onClick={() => setShowSaveModal(true)}
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Save Current
        </Button>
      </div>

      {/* Current Frequency Display */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Frequency:</div>
        <div className="font-mono text-lg text-gray-900 dark:text-white">
          {(currentFrequency / 1000000).toFixed(6)} MHz
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mode: {currentMode}
        </div>
      </div>

      {/* Memory Channel List */}
      {memoryChannels.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p>No memory channels saved</p>
          <p className="text-xs mt-1">Save your current frequency to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {memoryChannels.map((channel) => (
            <div
              key={channel.number}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {channel.number.toString().padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {channel.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {(channel.frequency / 1000000).toFixed(6)} MHz • {channel.mode}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRecallChannel(channel)}
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  Recall
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteChannel(channel.number)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Channel Modal */}
      <Modal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        title="Save Memory Channel"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <div className="font-medium">Current Settings:</div>
              <div className="font-mono mt-1">
                {(currentFrequency / 1000000).toFixed(6)} MHz • {currentMode}
              </div>
            </div>
          </div>

          <Input
            label="Channel Number (1-100)"
            type="number"
            min="1"
            max="100"
            value={saveChannelNumber}
            onChange={(e) => setSaveChannelNumber(e.target.value)}
            placeholder="e.g., 1"
            required
          />

          <Input
            label="Channel Name"
            value={saveChannelName}
            onChange={(e) => setSaveChannelName(e.target.value)}
            placeholder="e.g., 20m CW"
          />

          <div className="flex space-x-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowSaveModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveChannel}
              disabled={!saveChannelNumber}
              className="flex-1"
            >
              Save Channel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MemoryChannels;
