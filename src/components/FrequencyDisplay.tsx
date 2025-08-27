import React, { useState, useCallback } from 'react';

interface FrequencyDisplayProps {
  frequency: number;
  onChange: (frequency: number) => void;
}

const FrequencyDisplay: React.FC<FrequencyDisplayProps> = ({ frequency, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const formatFrequency = (freq: number): string => {
    if (freq === 0) return '0.000000';
    return (freq / 1000000).toFixed(6);
  };

  const handleEdit = useCallback(() => {
    setInputValue(formatFrequency(frequency));
    setEditing(true);
  }, [frequency]);

  const handleSave = useCallback(() => {
    try {
      const newFreq = parseFloat(inputValue) * 1000000;
      if (isNaN(newFreq) || newFreq < 0) {
        throw new Error('Invalid frequency');
      }
      onChange(newFreq);
      setEditing(false);
    } catch (error) {
      // Reset to current frequency on error
      setInputValue(formatFrequency(frequency));
    }
  }, [inputValue, frequency, onChange]);

  const handleCancel = useCallback(() => {
    setInputValue(formatFrequency(frequency));
    setEditing(false);
  }, [frequency]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const adjustFrequency = useCallback((delta: number) => {
    const newFreq = frequency + delta;
    if (newFreq >= 0) {
      onChange(newFreq);
    }
  }, [frequency, onChange]);

  return (
    <div className="text-center">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Frequency
      </h2>
      
      {/* Main Frequency Display */}
      <div className="mb-6">
        {editing ? (
          <div className="flex items-center justify-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSave}
              className="text-4xl font-mono text-center bg-transparent border-b-2 border-primary-500 focus:outline-none focus:border-primary-600 text-gray-900 dark:text-white w-64"
              autoFocus
            />
            <span className="text-2xl text-gray-500 dark:text-gray-400">MHz</span>
          </div>
        ) : (
          <div 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
            onClick={handleEdit}
          >
            <div className="text-4xl font-mono frequency-display text-gray-900 dark:text-white">
              {formatFrequency(frequency)}
            </div>
            <div className="text-2xl text-gray-500 dark:text-gray-400">MHz</div>
          </div>
        )}
      </div>

      {/* Frequency Adjustment Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* Large steps */}
        <div className="space-y-2">
          <button
            onClick={() => adjustFrequency(1000000)} // +1 MHz
            className="w-full px-3 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors text-sm font-medium"
          >
            +1 MHz
          </button>
          <button
            onClick={() => adjustFrequency(-1000000)} // -1 MHz
            className="w-full px-3 py-2 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors text-sm font-medium"
          >
            -1 MHz
          </button>
        </div>

        {/* Medium steps */}
        <div className="space-y-2">
          <button
            onClick={() => adjustFrequency(100000)} // +100 kHz
            className="w-full px-3 py-2 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors text-sm font-medium"
          >
            +100 kHz
          </button>
          <button
            onClick={() => adjustFrequency(-100000)} // -100 kHz
            className="w-full px-3 py-2 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors text-sm font-medium"
          >
            -100 kHz
          </button>
        </div>

        {/* Small steps */}
        <div className="space-y-2">
          <button
            onClick={() => adjustFrequency(10000)} // +10 kHz
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            +10 kHz
          </button>
          <button
            onClick={() => adjustFrequency(-10000)} // -10 kHz
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            -10 kHz
          </button>
        </div>
      </div>

      {/* Fine Tuning */}
      <div className="grid grid-cols-5 gap-1">
        {[-1000, -100, -10, -1, 0].map((delta, index) => (
          <button
            key={`down-${index}`}
            onClick={() => delta !== 0 && adjustFrequency(delta)}
            disabled={delta === 0}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              delta === 0 
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-default'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {delta === 0 ? 'Hz' : `${delta}`}
          </button>
        ))}
        {[+1, +10, +100, +1000, 0].map((delta, index) => (
          <button
            key={`up-${index}`}
            onClick={() => delta !== 0 && adjustFrequency(delta)}
            disabled={delta === 0}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              delta === 0 
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-default'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {delta === 0 ? 'Step' : `+${delta}`}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Click frequency to edit directly
      </p>
    </div>
  );
};

export default FrequencyDisplay;
