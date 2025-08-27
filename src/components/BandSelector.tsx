import React, { useState } from 'react';
import { amateurBands, getBandForFrequency } from '@/data/bands';
import type { RadioMode } from '@/types/radio';
import Button from './ui/Button';

interface BandSelectorProps {
  currentFrequency: number;
  onBandChange: (frequency: number, mode: RadioMode) => void;
}

const BandSelector: React.FC<BandSelectorProps> = ({
  currentFrequency,
  onBandChange,
}) => {
  const [showAll, setShowAll] = useState(false);
  const currentBand = getBandForFrequency(currentFrequency);

  // Popular bands for quick access
  const popularBands = ['80m', '40m', '20m', '15m', '10m', '2m'];
  const displayBands = showAll ? amateurBands : amateurBands.filter(band => 
    popularBands.includes(band.name)
  );

  const handleBandClick = (band: typeof amateurBands[0]) => {
    onBandChange(band.defaultFrequency, band.defaultMode as RadioMode);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Band Selection
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show Popular' : 'Show All'}
        </Button>
      </div>

      {/* Current Band Display */}
      {currentBand && (
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-primary-900 dark:text-primary-100">
                Current: {currentBand.name}
              </div>
              <div className="text-sm text-primary-700 dark:text-primary-300">
                {(currentBand.start / 1000000).toFixed(1)} - {(currentBand.end / 1000000).toFixed(1)} MHz
              </div>
            </div>
            <div className="text-sm text-primary-600 dark:text-primary-400">
              Modes: {currentBand.modes.join(', ')}
            </div>
          </div>
        </div>
      )}

      {/* Band Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayBands.map((band) => {
          const isActive = currentBand?.name === band.name;
          
          return (
            <button
              key={band.name}
              onClick={() => handleBandClick(band)}
              className={`
                p-3 rounded-lg border transition-all duration-200 text-left
                ${isActive
                  ? 'bg-primary-100 dark:bg-primary-900 border-primary-300 dark:border-primary-700 ring-2 ring-primary-500'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-lg ${
                  isActive 
                    ? 'text-primary-900 dark:text-primary-100' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {band.name}
                </span>
                {isActive && (
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                )}
              </div>
              
              <div className={`text-xs ${
                isActive 
                  ? 'text-primary-700 dark:text-primary-300' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {(band.defaultFrequency / 1000000).toFixed(3)} MHz
              </div>
              
              <div className={`text-xs mt-1 ${
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-500 dark:text-gray-500'
              }`}>
                {band.defaultMode}
              </div>
            </button>
          );
        })}
      </div>

      {/* Band Plan Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <div className="font-medium mb-1">Band Plan Notes:</div>
          <ul className="text-xs space-y-1">
            <li>• Click any band to jump to default frequency</li>
            <li>• Mode automatically selected based on band plan</li>
            <li>• Frequencies shown are band centers or popular calling frequencies</li>
            <li>• Always check local regulations and band plans</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BandSelector;
