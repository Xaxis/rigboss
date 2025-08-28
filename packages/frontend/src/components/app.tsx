import React, { useEffect } from 'react';
import { Layout } from '@/components/layout/layout';
import { PanelRouter } from '@/components/panel-router';
import { useUIStore } from '@/stores/ui';
import { initializeWebSocket } from '@/services/websocket';
import { toast } from '@/stores/ui';

export function App() {
  const { settings } = useUIStore();

  useEffect(() => {
    // Apply theme
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [settings.theme]);

  useEffect(() => {
    // Initialize WebSocket connection if auto-connect is enabled
    if (settings.autoConnect) {
      initializeWebSocket()
        .then(() => {
          toast.success('Backend Connected', 'Real-time communication established');
        })
        .catch((error) => {
          console.warn('WebSocket connection failed:', error);
          toast.error('Connection Failed', 'Could not connect to backend. Check settings.');
        });
    }
  }, [settings.autoConnect]);

  return (
    <Layout>
      <PanelRouter />
    </Layout>
  );
}
