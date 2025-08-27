import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import LiveIndicator from './LiveIndicator';

const StatusBar: React.FC = () => {
  const {
    radioState,
    backendConnected,
    radioConnected,
    lastUpdate,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatLastUpdate = (timestamp: number) => {
    if (!mounted) return 'Loading...';

    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const getSignalStrength = () => {
    // Simulate signal strength based on connection status
    if (!radioConnected) return 0;
    return Math.floor(Math.random() * 5) + 1; // 1-5 bars
  };

  const signalBars = getSignalStrength();

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between text-xs">
        {/* Left Side - Connection Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <LiveIndicator 
              active={backendConnected} 
              label="Backend" 
              size="sm"
              color="blue"
            />
            <LiveIndicator 
              active={radioConnected} 
              label="Radio" 
              size="sm"
              color="green"
            />
          </div>
          
          {/* Signal Strength */}
          {radioConnected && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-500 dark:text-gray-400">Signal:</span>
              <div className="flex items-end space-x-0.5">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className={`
                      w-1 transition-colors duration-200
                      ${bar <= signalBars 
                        ? 'bg-green-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                      }
                    `}
                    style={{ height: `${bar * 2 + 2}px` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center - Radio Status */}
        <div className="flex items-center space-x-4">
          {radioState.frequency && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 dark:text-gray-400">TX:</span>
              <LiveIndicator 
                active={radioState.ptt || false} 
                size="sm"
                color="red"
                pulse={true}
              />
            </div>
          )}
          
          {radioState.mode && (
            <div className="text-gray-600 dark:text-gray-300">
              {radioState.mode}
              {radioState.bandwidth && (
                <span className="ml-1 text-gray-500">
                  ({radioState.bandwidth}Hz)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side - System Info */}
        <div className="flex items-center space-x-4">
          <div className="text-gray-500 dark:text-gray-400">
            Last update: {formatLastUpdate(lastUpdate)}
          </div>
          
          {radioState.frequency && (
            <div className="font-mono text-gray-600 dark:text-gray-300">
              {(radioState.frequency / 1000000).toFixed(3)} MHz
            </div>
          )}
          
          <div className="text-gray-500 dark:text-gray-400">
            {mounted ? new Date().toLocaleTimeString() : '--:--:--'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
