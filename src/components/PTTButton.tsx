import React, { useState, useCallback, useRef, useEffect } from 'react';

interface PTTButtonProps {
  active: boolean;
  onChange: (active: boolean) => void;
}

const PTTButton: React.FC<PTTButtonProps> = ({ active, onChange }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Handle mouse/touch events for PTT
  const handleMouseDown = useCallback(() => {
    setIsPressed(true);
    onChange(true);
  }, [onChange]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
    onChange(false);
  }, [onChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTouchActive(true);
    setIsPressed(true);
    onChange(true);
  }, [onChange]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setTouchActive(false);
    setIsPressed(false);
    onChange(false);
  }, [onChange]);

  // Handle keyboard PTT (spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPressed(true);
        onChange(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPressed(false);
        onChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onChange]);

  // Prevent context menu on long press
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const buttonClasses = `
    relative w-full h-32 rounded-xl font-bold text-xl transition-all duration-150 transform
    select-none touch-manipulation
    ${active || isPressed
      ? 'bg-red-600 text-white shadow-lg scale-95 ring-4 ring-red-300 dark:ring-red-700'
      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 shadow-md'
    }
    ${isPressed ? 'animate-pulse' : ''}
    focus:outline-none focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-700
  `;

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        Push to Talk
      </h3>

      <button
        ref={buttonRef}
        className={buttonClasses}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
        aria-label="Push to Talk"
        type="button"
      >
        {/* PTT Icon */}
        <div className="flex flex-col items-center justify-center h-full">
          <svg 
            className={`h-12 w-12 mb-2 ${active || isPressed ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
          
          <div className="text-center">
            <div className="font-bold">
              {active || isPressed ? 'TRANSMITTING' : 'PTT'}
            </div>
            <div className="text-sm opacity-75">
              {active || isPressed ? 'Release to stop' : 'Hold to transmit'}
            </div>
          </div>
        </div>

        {/* Active indicator */}
        {(active || isPressed) && (
          <div className="absolute top-2 right-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
          </div>
        )}
      </button>

      {/* Instructions */}
      <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center">
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          <span>Hold button or spacebar to transmit</span>
        </div>
        <div className="flex items-center">
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Touch-friendly for mobile devices</span>
        </div>
      </div>

      {/* Warning */}
      {(active || isPressed) && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-200">
              <div className="font-medium">Transmitting</div>
              <div>Radio is currently transmitting RF energy</div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Notice */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="text-xs text-yellow-700 dark:text-yellow-300">
          <div className="font-medium mb-1">Safety Reminder:</div>
          <div>• Ensure proper antenna connection</div>
          <div>• Check frequency and mode before transmitting</div>
          <div>• Follow local regulations and band plans</div>
          <div>• Keep transmissions brief and courteous</div>
        </div>
      </div>
    </div>
  );
};

export default PTTButton;
