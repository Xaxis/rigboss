import React, { useState, useCallback } from 'react';

interface PowerControlProps {
  power: number;
  maxPower: number;
  onChange: (power: number) => void;
}

const PowerControl: React.FC<PowerControlProps> = ({ power, maxPower, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newPower = parseInt(e.target.value);
    onChange(newPower);
  }, [onChange]);

  const handleEdit = useCallback(() => {
    setInputValue(power.toString());
    setEditing(true);
  }, [power]);

  const handleSave = useCallback(() => {
    try {
      const newPower = parseInt(inputValue);
      if (isNaN(newPower) || newPower < 0 || newPower > maxPower) {
        throw new Error('Invalid power level');
      }
      onChange(newPower);
      setEditing(false);
    } catch (error) {
      setInputValue(power.toString());
    }
  }, [inputValue, power, maxPower, onChange]);

  const handleCancel = useCallback(() => {
    setInputValue(power.toString());
    setEditing(false);
  }, [power]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const adjustPower = useCallback((delta: number) => {
    const newPower = Math.max(0, Math.min(maxPower, power + delta));
    onChange(newPower);
  }, [power, maxPower, onChange]);

  const getPowerColor = (powerLevel: number): string => {
    if (powerLevel <= 25) return 'text-green-600 dark:text-green-400';
    if (powerLevel <= 50) return 'text-yellow-600 dark:text-yellow-400';
    if (powerLevel <= 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSliderColor = (powerLevel: number): string => {
    if (powerLevel <= 25) return 'accent-green-500';
    if (powerLevel <= 50) return 'accent-yellow-500';
    if (powerLevel <= 75) return 'accent-orange-500';
    return 'accent-red-500';
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        RF Power
      </h3>

      {/* Power Display */}
      <div className="mb-6 text-center">
        {editing ? (
          <div className="flex items-center justify-center space-x-2">
            <input
              type="number"
              min="0"
              max={maxPower}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              onBlur={handleSave}
              className="text-3xl font-bold text-center bg-transparent border-b-2 border-primary-500 focus:outline-none focus:border-primary-600 text-gray-900 dark:text-white w-20"
              autoFocus
            />
            <span className="text-xl text-gray-500 dark:text-gray-400">%</span>
          </div>
        ) : (
          <div 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
            onClick={handleEdit}
          >
            <div className={`text-3xl font-bold ${getPowerColor(power)}`}>
              {power}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Click to edit
            </div>
          </div>
        )}
      </div>

      {/* Power Slider */}
      <div className="mb-6">
        <input
          type="range"
          min="0"
          max={maxPower}
          value={power}
          onChange={handleSliderChange}
          className={`w-full h-3 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 ${getSliderColor(power)}`}
          style={{
            background: `linear-gradient(to right, 
              #10b981 0%, 
              #10b981 25%, 
              #f59e0b 25%, 
              #f59e0b 50%, 
              #f97316 50%, 
              #f97316 75%, 
              #ef4444 75%, 
              #ef4444 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Quick Power Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[5, 25, 50, 100].map((powerLevel) => (
          <button
            key={powerLevel}
            onClick={() => onChange(powerLevel)}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              power === powerLevel
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {powerLevel}%
          </button>
        ))}
      </div>

      {/* Fine Adjustment */}
      <div className="grid grid-cols-5 gap-1 mb-4">
        <button
          onClick={() => adjustPower(-10)}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          -10
        </button>
        <button
          onClick={() => adjustPower(-5)}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          -5
        </button>
        <button
          onClick={() => adjustPower(-1)}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          -1
        </button>
        <button
          onClick={() => adjustPower(1)}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          +1
        </button>
        <button
          onClick={() => adjustPower(5)}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          +5
        </button>
      </div>

      {/* Power Warning */}
      {power > 75 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-200">
              <div className="font-medium">High Power Warning</div>
              <div>Ensure proper antenna and cooling</div>
            </div>
          </div>
        </div>
      )}

      {/* Power Info */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="text-xs text-blue-700 dark:text-blue-300">
          <div className="font-medium mb-1">Power Guidelines:</div>
          <div>• QRP: 5-10% for low power operation</div>
          <div>• Normal: 25-50% for most contacts</div>
          <div>• DX: 75-100% for distant stations</div>
        </div>
      </div>
    </div>
  );
};

export default PowerControl;
