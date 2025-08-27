import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';

interface AudioControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const AudioControl: React.FC<AudioControlProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  onChange,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

interface ToggleControlProps {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

const ToggleControl: React.FC<ToggleControlProps> = ({
  label,
  enabled,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled
            ? 'bg-blue-600'
            : 'bg-gray-200 dark:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

const RadioAudioControls: React.FC = () => {
  const { radioState, radioConnected, addToast } = useAppStore();
  
  // Local state for audio levels
  const [audioLevels, setAudioLevels] = useState({
    volume: 50,
    rfGain: 50,
    micGain: 50,
    squelch: 10,
    voxGain: 50,
    compressor: 0,
    noiseReduction: 0,
    agc: 3, // Medium
  });

  const [audioFunctions, setAudioFunctions] = useState({
    vox: false,
    compressor: false,
    noiseReduction: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  // AGC Mode options
  const agcModes = [
    { value: 0, label: 'OFF' },
    { value: 1, label: 'SUPERFAST' },
    { value: 2, label: 'FAST' },
    { value: 3, label: 'MEDIUM' },
    { value: 4, label: 'SLOW' },
    { value: 5, label: 'USER' },
    { value: 6, label: 'AUTO' },
  ];

  // Send audio level change to backend
  const handleLevelChange = async (level: string, value: number) => {
    if (!radioConnected) {
      addToast({ type: 'error', title: 'Radio Disconnected', message: 'Connect to radio first' });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/radio/audio/level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, value })
      });

      if (!response.ok) {
        throw new Error('Failed to set audio level');
      }

      addToast({ 
        type: 'success', 
        title: 'Audio Updated', 
        message: `${level.toUpperCase()} set to ${value}%`,
        duration: 2000 
      });
    } catch (error) {
      addToast({ type: 'error', title: 'Audio Error', message: 'Failed to update audio level' });
    } finally {
      setIsLoading(false);
    }
  };

  // Send audio function change to backend
  const handleFunctionChange = async (func: string, enabled: boolean) => {
    if (!radioConnected) {
      addToast({ type: 'error', title: 'Radio Disconnected', message: 'Connect to radio first' });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/radio/audio/function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ function: func, enabled })
      });

      if (!response.ok) {
        throw new Error('Failed to set audio function');
      }

      addToast({ 
        type: 'success', 
        title: 'Audio Updated', 
        message: `${func.toUpperCase()} ${enabled ? 'enabled' : 'disabled'}`,
        duration: 2000 
      });
    } catch (error) {
      addToast({ type: 'error', title: 'Audio Error', message: 'Failed to update audio function' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Essential Audio Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Essential Audio</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AudioControl
            label="Volume (AF)"
            value={audioLevels.volume}
            onChange={(value) => {
              setAudioLevels(prev => ({ ...prev, volume: value }));
              handleLevelChange('AF', value);
            }}
            disabled={!radioConnected || isLoading}
          />
          <AudioControl
            label="RF Gain"
            value={audioLevels.rfGain}
            onChange={(value) => {
              setAudioLevels(prev => ({ ...prev, rfGain: value }));
              handleLevelChange('RF', value);
            }}
            disabled={!radioConnected || isLoading}
          />
          <AudioControl
            label="Microphone Gain"
            value={audioLevels.micGain}
            onChange={(value) => {
              setAudioLevels(prev => ({ ...prev, micGain: value }));
              handleLevelChange('MICGAIN', value);
            }}
            disabled={!radioConnected || isLoading}
          />
          <AudioControl
            label="Squelch"
            value={audioLevels.squelch}
            onChange={(value) => {
              setAudioLevels(prev => ({ ...prev, squelch: value }));
              handleLevelChange('SQL', value);
            }}
            disabled={!radioConnected || isLoading}
          />
        </div>
      </div>

      {/* Advanced Audio Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Advanced Audio</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <AudioControl
              label="VOX Gain"
              value={audioLevels.voxGain}
              onChange={(value) => {
                setAudioLevels(prev => ({ ...prev, voxGain: value }));
                handleLevelChange('VOXGAIN', value);
              }}
              disabled={!radioConnected || isLoading}
            />
            <AudioControl
              label="Speech Compressor"
              value={audioLevels.compressor}
              onChange={(value) => {
                setAudioLevels(prev => ({ ...prev, compressor: value }));
                handleLevelChange('COMP', value);
              }}
              disabled={!radioConnected || isLoading}
            />
            <AudioControl
              label="Noise Reduction"
              value={audioLevels.noiseReduction}
              onChange={(value) => {
                setAudioLevels(prev => ({ ...prev, noiseReduction: value }));
                handleLevelChange('NR', value);
              }}
              disabled={!radioConnected || isLoading}
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AGC Mode
              </label>
              <select
                value={audioLevels.agc}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setAudioLevels(prev => ({ ...prev, agc: value }));
                  handleLevelChange('AGC', value);
                }}
                disabled={!radioConnected || isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {agcModes.map(mode => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <ToggleControl
                label="VOX"
                enabled={audioFunctions.vox}
                onChange={(enabled) => {
                  setAudioFunctions(prev => ({ ...prev, vox: enabled }));
                  handleFunctionChange('VOX', enabled);
                }}
                disabled={!radioConnected || isLoading}
              />
              <ToggleControl
                label="Compressor Enable"
                enabled={audioFunctions.compressor}
                onChange={(enabled) => {
                  setAudioFunctions(prev => ({ ...prev, compressor: enabled }));
                  handleFunctionChange('COMP', enabled);
                }}
                disabled={!radioConnected || isLoading}
              />
              <ToggleControl
                label="Noise Reduction Enable"
                enabled={audioFunctions.noiseReduction}
                onChange={(enabled) => {
                  setAudioFunctions(prev => ({ ...prev, noiseReduction: enabled }));
                  handleFunctionChange('NR', enabled);
                }}
                disabled={!radioConnected || isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {!radioConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ Connect to radio to access audio controls
          </p>
        </div>
      )}
    </div>
  );
};

export default RadioAudioControls;
