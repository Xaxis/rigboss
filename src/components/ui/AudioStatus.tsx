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
    selectedMicrophone,
    setActiveView
  } = useAppStore();

  const handleToggleAudio = () => {
    if (isAudioActive) {
      stopGlobalAudio();
    } else {
      startGlobalAudio();
    }
  };

  const openAudioPanel = () => {
    setActiveView('audio');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 14.142M9 9a3 3 0 000 6v-6z" />
          </svg>
          <h4 className="font-medium text-gray-900 dark:text-white">Audio</h4>
        </div>
        <button
          onClick={handleToggleAudio}
          disabled={!selectedMicrophone}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
            isAudioActive
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
              : selectedMicrophone
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {isAudioActive ? '🔇 Stop' : '🎧 Start'}
        </button>
      </div>

      {/* Status Display */}
      <div className="flex-1 space-y-3">
        {/* RX Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isAudioActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">RX</span>
            </div>
            {isAudioActive && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">ACTIVE</span>
            )}
          </div>
          {isAudioActive ? (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(100, rxAudioLevel)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{Math.round(rxAudioLevel)}%</span>
              </div>
              <p className="text-xs text-gray-500">Radio → Speakers</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Radio audio inactive</p>
          )}
        </div>

        {/* TX Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isTransmitting ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">TX</span>
            </div>
            {isTransmitting && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">TRANSMITTING</span>
            )}
          </div>
          {isTransmitting ? (
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(100, microphoneLevel)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">{Math.round(microphoneLevel)}%</span>
              </div>
              <p className="text-xs text-gray-500">Mic → Radio</p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Press PTT to transmit</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        {!selectedMicrophone ? (
          <button
            onClick={openAudioPanel}
            className="w-full text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 transition-colors"
          >
            ⚠️ Configure audio devices
          </button>
        ) : (
          <button
            onClick={openAudioPanel}
            className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            ⚙️ Audio settings
          </button>
        )}
      </div>
    </div>
  );
};

export default AudioStatus;
