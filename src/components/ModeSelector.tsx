import React, { useState } from 'react';
import type { RadioMode } from '@/types/radio';

interface ModeSelectorProps {
  mode: RadioMode;
  bandwidth: number;
  onChange: (mode: RadioMode, bandwidth?: number) => void;
}

const MODES: { value: RadioMode; label: string; bandwidths?: number[] }[] = [
  { value: 'LSB', label: 'LSB', bandwidths: [2400, 2100, 1800, 1500] },
  { value: 'USB', label: 'USB', bandwidths: [2400, 2100, 1800, 1500] },
  { value: 'CW', label: 'CW', bandwidths: [500, 250, 100, 50] },
  { value: 'CWR', label: 'CW-R', bandwidths: [500, 250, 100, 50] },
  { value: 'AM', label: 'AM', bandwidths: [6000, 3000, 2400] },
  { value: 'FM', label: 'FM', bandwidths: [15000, 10000, 7000] },
  { value: 'WFM', label: 'WFM', bandwidths: [230000] },
  { value: 'RTTY', label: 'RTTY', bandwidths: [500, 250, 100] },
  { value: 'RTTYR', label: 'RTTY-R', bandwidths: [500, 250, 100] },
  { value: 'PSK', label: 'PSK', bandwidths: [500, 250, 100] },
  { value: 'PSKR', label: 'PSK-R', bandwidths: [500, 250, 100] },
  { value: 'FT8', label: 'FT8', bandwidths: [2400] },
  { value: 'FT4', label: 'FT4', bandwidths: [2400] },
  { value: 'DATA', label: 'DATA', bandwidths: [2400, 500, 250] },
];

const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, bandwidth, onChange }) => {
  const [showBandwidthSelector, setShowBandwidthSelector] = useState(false);

  const currentModeInfo = MODES.find(m => m.value === mode);
  const availableBandwidths = currentModeInfo?.bandwidths || [];

  const handleModeChange = (newMode: RadioMode) => {
    const modeInfo = MODES.find(m => m.value === newMode);
    const defaultBandwidth = modeInfo?.bandwidths?.[0];
    onChange(newMode, defaultBandwidth);
    setShowBandwidthSelector(false);
  };

  const handleBandwidthChange = (newBandwidth: number) => {
    onChange(mode, newBandwidth);
    setShowBandwidthSelector(false);
  };

  const formatBandwidth = (bw: number): string => {
    if (bw >= 1000) {
      return `${(bw / 1000).toFixed(1)}k`;
    }
    return `${bw}`;
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Mode & Bandwidth
      </h3>

      {/* Current Mode Display */}
      <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {mode}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatBandwidth(bandwidth)} Hz
          </div>
        </div>
      </div>

      {/* Mode Selection Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {MODES.map((modeInfo) => (
          <button
            key={modeInfo.value}
            onClick={() => handleModeChange(modeInfo.value)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === modeInfo.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {modeInfo.label}
          </button>
        ))}
      </div>

      {/* Bandwidth Selection */}
      {availableBandwidths.length > 1 && (
        <div>
          <button
            onClick={() => setShowBandwidthSelector(!showBandwidthSelector)}
            className="w-full px-4 py-2 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors text-sm font-medium mb-2"
          >
            Bandwidth: {formatBandwidth(bandwidth)} Hz
            <svg 
              className={`inline-block ml-2 h-4 w-4 transition-transform ${showBandwidthSelector ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showBandwidthSelector && (
            <div className="grid grid-cols-2 gap-2">
              {availableBandwidths.map((bw) => (
                <button
                  key={bw}
                  onClick={() => handleBandwidthChange(bw)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    bandwidth === bw
                      ? 'bg-secondary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {formatBandwidth(bw)} Hz
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mode Information */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <div className="font-medium mb-1">Mode Information:</div>
          {mode === 'USB' && 'Upper Sideband - Voice and digital modes above 10 MHz'}
          {mode === 'LSB' && 'Lower Sideband - Voice modes below 10 MHz'}
          {mode === 'CW' && 'Continuous Wave - Morse code transmission'}
          {mode === 'AM' && 'Amplitude Modulation - Legacy voice mode'}
          {mode === 'FM' && 'Frequency Modulation - VHF/UHF voice'}
          {mode === 'FT8' && 'Weak signal digital mode - 15 second cycles'}
          {mode === 'FT4' && 'Fast digital mode - 7.5 second cycles'}
          {mode === 'DATA' && 'Digital data modes - PSK31, RTTY, etc.'}
          {!['USB', 'LSB', 'CW', 'AM', 'FM', 'FT8', 'FT4', 'DATA'].includes(mode) && 
           'Digital or specialized mode'}
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;
