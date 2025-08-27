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
        // 1) Test if backend is reachable at default URL
        const isReachable = await backendConfig.testConnection();
        if (!isReachable) {
          // Backend not reachable, show connection modal
          setActiveModal('connection');
          return;
        }

        // 2) Connect Socket.IO to backend
        await socketService.connect();
        setBackendConnected(true);

        // 3) Ask backend for current health; set radio state accordingly
        const healthRes = await fetch(`${backendConfig.apiUrl}/health`);
        if (healthRes.ok) {
          const health = await healthRes.json();
          // Modular backend health structure: { data: { health: { radio: ServiceMetadata } } }
          const services = health.data?.health || health.health;
          const radioMeta = services?.radio;
          const isRadioConnected = radioMeta?.health?.details?.rigctldConnected;
          if (typeof isRadioConnected === 'boolean') {
            setRadioConnected(isRadioConnected);
            if (isRadioConnected) return; // already connected, no modal
          }
        }

        // 4) Auto-connect to local rigctld on the backend
        try {
          setConnecting(true);
          const res = await fetch(`${backendConfig.apiUrl}/radio/connect`, {
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

        // 5) If still not connected, show modal for user input
        setActiveModal('connection');
      } catch (error) {
        console.error('Failed to connect to backend:', error);
        setError('Failed to connect to backend server');
        setBackendConnected(false);
        setActiveModal('connection');
      }
    };
    // Set up event listeners BEFORE initializing connection to avoid race conditions
    socketService.on('connected', (isConnected: boolean) => {
      setBackendConnected(isConnected);
    });
    socketService.on('radio_state', (state: any) => {
      setRadioState(state);
      setRadioConnected(true); // receiving state implies radio is online
    });
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

    // Now initialize connection
    initializeConnection();

    return () => {
      socketService.disconnect();
    };
  }, [setBackendConnected, setRadioConnected, setRadioState, setError, setActiveModal, setConnecting, addToast]);

  // Handle connection to radio server
  const handleConnect = async (serverHost: string) => {
    console.log('[AppLayout] handleConnect called with serverHost:', serverHost);
    setConnecting(true);
    setError(null);

    try {
      console.log('[AppLayout] Current backend URLs:', {
        baseUrl: backendConfig.baseUrl,
        apiUrl: backendConfig.apiUrl,
        socketUrl: backendConfig.socketUrl
      });

      // Reconnect socket to new backend URL
      console.log('[AppLayout] Disconnecting socket...');
      socketService.disconnect();
      console.log('[AppLayout] Reconnecting socket...');
      await socketService.connect();
      setBackendConnected(true);
      console.log('[AppLayout] Socket reconnected successfully');

      const apiUrl = `${backendConfig.apiUrl}/radio/connect`;
      console.log('[AppLayout] Making API call to:', apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host: 'localhost', port: 4532 }), // Backend connects to local rigctld
      });
      console.log('[AppLayout] API response status:', response.status);

      const result = await response.json();
      console.log('[AppLayout] API response result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Connection failed');
      }

      // Optimistically mark radio as connected; socket events and health will confirm
      setRadioConnected(true);

      // Immediately fetch current radio state and update UI
      try {
        const stateRes = await fetch(`${backendConfig.apiUrl}/radio/state`);
        if (stateRes.ok) {
          const stateJson = await stateRes.json();
          const state = stateJson.state || stateJson.data?.state || stateJson.data;
          if (state) {
            setRadioState(state);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch radio state after connection:', e);
      }

      // Wait a moment for backend to emit connection_status, then check health as fallback
      setTimeout(async () => {
        try {
          const healthRes = await fetch(`${backendConfig.apiUrl}/health`);
          if (healthRes.ok) {
            const health = await healthRes.json();
            const radioHealth = health.data?.health?.radio || health.health?.radio;
            const isRadioConnected = radioHealth?.details?.rigctldConnected;
            if (typeof isRadioConnected === 'boolean') {
              setRadioConnected(isRadioConnected);
            }
          }
        } catch (e) {
          console.warn('Failed to check health after connection:', e);
        }
      }, 500);

      // Update config with successful connection
      useAppStore.getState().updateConfig({
        radio: {
          ...config.radio,
          rigctldHost: 'localhost', // Backend handles rigctld connection
          rigctldPort: 4532,
        }
      });

      setActiveModal(null);
      addToast({
        type: 'success',
        title: 'Connected',
        message: `Successfully connected to radio server at ${serverHost}`,
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
