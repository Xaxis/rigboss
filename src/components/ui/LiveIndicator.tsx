import React from 'react';

interface LiveIndicatorProps {
  active: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'green' | 'red' | 'yellow' | 'blue';
  pulse?: boolean;
  className?: string;
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  active,
  label,
  size = 'md',
  color = 'green',
  pulse = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    green: active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
    red: active ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600',
    yellow: active ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600',
    blue: active ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
  };

  const pulseClass = active && pulse ? 'animate-pulse' : '';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[color]} 
          ${pulseClass}
          rounded-full transition-colors duration-200
        `}
        title={label}
      />
      {label && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  );
};

export default LiveIndicator;
