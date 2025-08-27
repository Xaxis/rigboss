import React from 'react';

interface ConnectionStatusProps {
  backendConnected: boolean;
  radioConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  backendConnected, 
  radioConnected 
}) => {
  const getStatusColor = (connected: boolean): string => {
    return connected ? 'text-green-500' : 'text-red-500';
  };

  const getStatusBg = (connected: boolean): string => {
    return connected 
      ? 'bg-green-100 dark:bg-green-900/20' 
      : 'bg-red-100 dark:bg-red-900/20';
  };

  const getStatusText = (backendConn: boolean, radioConn: boolean): string => {
    if (!backendConn) return 'Backend Offline';
    if (!radioConn) return 'Radio Offline';
    return 'Connected';
  };

  const overallConnected = backendConnected && radioConnected;

  return (
    <div className="flex items-center space-x-3">
      {/* Status Indicators */}
      <div className="flex items-center space-x-2">
        {/* Backend Status */}
        <div className="flex items-center space-x-1">
          <div 
            className={`w-2 h-2 rounded-full ${
              backendConnected ? 'bg-green-500' : 'bg-red-500'
            } ${backendConnected ? 'animate-pulse' : ''}`}
            title={`Backend: ${backendConnected ? 'Connected' : 'Disconnected'}`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            Backend
          </span>
        </div>

        {/* Radio Status */}
        <div className="flex items-center space-x-1">
          <div 
            className={`w-2 h-2 rounded-full ${
              radioConnected ? 'bg-green-500' : 'bg-red-500'
            } ${radioConnected ? 'animate-pulse' : ''}`}
            title={`Radio: ${radioConnected ? 'Connected' : 'Disconnected'}`}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
            Radio
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBg(overallConnected)}`}>
        <div className="flex items-center space-x-1">
          <svg 
            className={`h-3 w-3 ${getStatusColor(overallConnected)}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {overallConnected ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            )}
          </svg>
          <span className={getStatusColor(overallConnected)}>
            {getStatusText(backendConnected, radioConnected)}
          </span>
        </div>
      </div>

      {/* Detailed Status (Desktop) */}
      <div className="hidden lg:block">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <span>Server:</span>
              <span className={getStatusColor(backendConnected)}>
                {backendConnected ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span>Radio:</span>
              <span className={getStatusColor(radioConnected)}>
                {radioConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
