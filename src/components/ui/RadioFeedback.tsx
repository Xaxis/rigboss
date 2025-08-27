import React from 'react';

interface RadioFeedbackProps {
  isLive: boolean;
  lastUpdated?: Date;
  children: React.ReactNode;
  className?: string;
}

/**
 * RadioFeedback - Wraps controls to indicate real-time radio feedback
 * Shows a visual indicator when the value is live from the radio vs local/cached
 */
const RadioFeedback: React.FC<RadioFeedbackProps> = ({ 
  isLive, 
  lastUpdated, 
  children, 
  className = '' 
}) => {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Live indicator - tighter spacing, top-right chip */}
      <div className="absolute -top-2 -right-2 z-10">
        <div className={`px-2 py-0.5 rounded-full border text-[10px] leading-none flex items-center space-x-1 shadow-sm ${
          isLive
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span>{isLive ? 'LIVE' : lastUpdated ? getTimeAgo(lastUpdated) : 'CACHED'}</span>
        </div>
      </div>

      {/* Control content */}
      <div className={`${isLive ? 'ring-2 ring-green-500/20' : 'ring-1 ring-gray-300 dark:ring-gray-600'} rounded-lg transition-all duration-200`}
        style={{ paddingTop: '6px' }}
      >
        {children}
      </div>
    </div>
  );
};

interface RadioControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  isLive?: boolean;
  lastUpdated?: Date;
}

/**
 * RadioControl - Audio control with radio feedback indication
 */
export const RadioControl: React.FC<RadioControlProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  onChange,
  disabled = false,
  isLive = false,
  lastUpdated
}) => {
  return (
    <RadioFeedback isLive={isLive} lastUpdated={lastUpdated}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono text-gray-900 dark:text-white">
              {value}{unit}
            </span>
            {isLive && (
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer transition-all duration-200 ${
            isLive 
              ? 'bg-green-100 dark:bg-green-900/30' 
              : 'bg-gray-200 dark:bg-gray-700'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        
        <div className="flex justify-between text-xs text-gray-400">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
    </RadioFeedback>
  );
};

interface RadioToggleProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  isLive?: boolean;
  lastUpdated?: Date;
}

/**
 * RadioToggle - Toggle control with radio feedback indication
 */
export const RadioToggle: React.FC<RadioToggleProps> = ({
  label,
  enabled,
  onChange,
  disabled = false,
  isLive = false,
  lastUpdated
}) => {
  return (
    <RadioFeedback isLive={isLive} lastUpdated={lastUpdated}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onChange(!enabled)}
              disabled={disabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled
                  ? isLive ? 'bg-green-600' : 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            {isLive && (
              <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </RadioFeedback>
  );
};

export default RadioFeedback;
