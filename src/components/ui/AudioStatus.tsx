import React from 'react';
import { useAppStore } from '@/stores/appStore';

const AudioStatus: React.FC = () => {
  const { 
    audioEnabled: isAudioActive,
    isTransmitting,
    rxAudioLevel,
    microphoneLevel,
    startGlobalAudio,
    stopGlobalAudio,
    selectedMicrophone
  } = useAppStore();

  const handleToggleAudio = () => {
    if (isAudioActive) {
      stopGlobalAudio();
    } else {
      startGlobalAudio();
    }
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">Audio</h4>
        <button
          onClick={handleToggleAudio}
          disabled={!selectedMicrophone}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isAudioActive 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : selectedMicrophone
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {isAudioActive ? 'Stop' : 'Start'}
        </button>
      </div>

      <div className="space-y-2">
        {/* RX Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isAudioActive ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">RX</span>
          {isAudioActive && (
            <div className="flex items-center space-x-1">
              <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, rxAudioLevel)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-6">{Math.round(rxAudioLevel)}%</span>
            </div>
          )}
        </div>

        {/* TX Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isTransmitting ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">TX</span>
          {isTransmitting && (
            <div className="flex items-center space-x-1">
              <div className="w-12 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                <div 
                  className="bg-red-500 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(100, microphoneLevel)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-6">{Math.round(microphoneLevel)}%</span>
            </div>
          )}
        </div>
      </div>

      {!selectedMicrophone && (
        <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
          Configure in Audio panel
        </div>
      )}
    </div>
  );
};

export default AudioStatus;
