import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { socketService } from '@/utils/socket';
import { backendConfig } from '@/utils/backendConfig';
import ThemeProvider from '@/contexts/ThemeContext';
import Header from './Header';
import Sidebar from './Sidebar';
import ErrorBanner from './ErrorBanner';
import StatusBar from '../ui/StatusBar';
import { ToastManager } from '../ui/Toast';
import ConnectionModal from '../modals/ConnectionModal';
import SettingsModal from '../modals/SettingsModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const {
    backendConnected,
    radioConnected,
    error,
    activeModal,
    sidebarOpen,
    connecting,
    setBackendConnected,
    setRadioConnected,
    setRadioState,
    setError,
    setActiveModal,
    setConnecting,
    config,
    toasts,
    removeToast,
    addToast,
  } = useAppStore();

  // Initialize socket connection and event handlers
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        // 1) Connect Socket.IO (same-origin)
        await socketService.connect();
        setBackendConnected(true);

        // 2) Ask backend for current health; set radio state accordingly
        const healthRes = await fetch(`${backendConfig.apiUrl}/health`);
        if (healthRes.ok) {
          const health = await healthRes.json();
          setRadioConnected(!!health?.rigctld?.connected);
          if (health?.rigctld?.connected) return; // already connected, no modal
        }

        // 3) Auto-connect to local rigctld on the Pi
        try {
          setConnecting(true);
          const res = await fetch(`${backendConfig.apiUrl}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: 'localhost', port: 4532 })
          });
          const result = await res.json();
          if (res.ok && result?.success) {
            setRadioConnected(true);
            return;
          }
        } catch {
          // ignore and fall through to modal
        } finally {
          setConnecting(false);
        }

        // 4) If still not connected, show modal for user input
        setActiveModal('connection');
      } catch (error) {
        console.error('Failed to connect to backend:', error);
        setError('Failed to connect to backend server');
        setBackendConnected(false);
      }
    };

    initializeConnection();

    // Set up event listeners
    socketService.on('connected', setBackendConnected);
    socketService.on('radio_state', setRadioState);
    socketService.on('connection_status', (status: { connected: boolean; radio?: string }) => {
      setRadioConnected(status.connected);
      if (status.radio) {
        setRadioState({ model: status.radio });
      }
    });
    socketService.on('error', (error: Error) => {
      setError(error.message);
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: error.message,
      });
      setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
    });

    return () => {
      socketService.disconnect();
    };
  }, [setBackendConnected, setRadioConnected, setRadioState, setError, setActiveModal, setConnecting, addToast]);

  // Handle connection to rigctld
  const handleConnect = async (host: string, port: number) => {
    setConnecting(true);
    setError(null);
    
    try {
      const response = await fetch(`${backendConfig.apiUrl}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host, port }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Connection failed');
      }
      
      // Update config with successful connection
      useAppStore.getState().updateConfig({
        radio: {
          ...config.radio,
          rigctldHost: host,
          rigctldPort: port,
        }
      });
      
      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Connected',
        message: `Successfully connected to rigctld at ${host}:${port}`,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
      addToast({
        type: 'error',
        title: 'Connection Failed',
        message: error instanceof Error ? error.message : 'Connection failed',
      });
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Fixed Toast Container at top-right */}
        <div id="toast-root" className="fixed top-4 right-4 z-[99999] pointer-events-none max-w-sm space-y-2" />

        {/* Header */}
        <Header />

        {/* Error Banner */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Main Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar isOpen={sidebarOpen} />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>

        {/* Status Bar */}
        <StatusBar />

        {/* Modals */}
        <ConnectionModal
          isOpen={activeModal === 'connection'}
          onClose={() => setActiveModal(null)}
          onConnect={handleConnect}
          connecting={connecting}
        />

        <SettingsModal
          isOpen={activeModal === 'settings'}
          onClose={() => setActiveModal(null)}
        />

      </div>
    </ThemeProvider>
  );
};

export default AppLayout;
