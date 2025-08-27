import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  };

  const typeStyles = {
    success: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-500',
      iconPath: 'M5 13l4 4L19 7',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-500',
      iconPath: 'M6 18L18 6M6 6l12 12',
    },
    warning: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-500',
      iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-500',
      iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  };

  const style = typeStyles[type];

  const toastContent = (
    <div
      className={`
        max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
        }
      `}
    >
      <div className={`
        ${style.bg} ${style.border}
        border rounded-lg shadow-2xl p-4
        backdrop-blur-sm
        ring-1 ring-black/5 dark:ring-white/10
      `}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg 
              className={`h-5 w-5 ${style.icon}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d={style.iconPath} 
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
            {message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(toastContent, document.body);
};

// Toast Manager Component
interface ToastManagerProps {
  toasts: ToastProps[];
  onRemove: (id: string) => void;
}

export const ToastManager: React.FC<ToastManagerProps> = ({ toasts, onRemove }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Create toast container if it doesn't exist
    let toastRoot = document.getElementById('toast-root');
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = 'toast-root';
      toastRoot.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 999999;
        pointer-events: none;
        max-width: 400px;
      `;
      document.body.appendChild(toastRoot);
    }

    // Cleanup function
    return () => {
      const toastRoot = document.getElementById('toast-root');
      if (toastRoot && toastRoot.children.length === 0) {
        toastRoot.remove();
      }
    };
  }, []);

  if (!mounted) return null;

  const toastRoot = document.getElementById('toast-root');
  if (!toastRoot) return null;

  const toastContainer = (
    <div className="space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            zIndex: 99999 + index,
            transform: `translateY(${index * 2}px)` // Slight stagger effect
          }}
          className="pointer-events-auto toast-item"
        >
          <Toast {...toast} onClose={onRemove} />
        </div>
      ))}
    </div>
  );

  return createPortal(toastContainer, toastRoot);
};

export default Toast;
