import type { Config } from '@/types';

// Get configuration from environment variables and settings
export function getConfig(): Config {
  // Try to get from environment first, then fall back to localStorage settings
  let backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  
  // Check if we have stored settings that override the environment
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('rigboss-ui-store');
      if (stored) {
        const state = JSON.parse(stored);
        const settingsBackendUrl = state?.state?.settings?.backendUrl;
        if (settingsBackendUrl) {
          backendUrl = settingsBackendUrl;
        }
      }
    } catch (error) {
      console.warn('Failed to load backend URL from settings:', error);
    }
  }

  // Ensure URL doesn't end with slash
  backendUrl = backendUrl.replace(/\/$/, '');
  
  // Create WebSocket URL from HTTP URL
  const wsUrl = backendUrl.replace(/^http/, 'ws');

  return {
    backendUrl,
    wsUrl,
    apiTimeout: 10000,
    reconnectInterval: 2000,
    maxReconnectAttempts: 5,
  };
}

// Update the Vite proxy configuration dynamically
export function updateProxyConfig(newBackendUrl: string): void {
  if (typeof window === 'undefined') return;
  
  // Store the new URL for future use
  try {
    const stored = localStorage.getItem('rigboss-ui-store');
    if (stored) {
      const state = JSON.parse(stored);
      if (state?.state?.settings) {
        state.state.settings.backendUrl = newBackendUrl;
        localStorage.setItem('rigboss-ui-store', JSON.stringify(state));
      }
    }
  } catch (error) {
    console.warn('Failed to update backend URL in settings:', error);
  }
  
  // For development, we need to reload the page to pick up the new proxy config
  if (import.meta.env.DEV) {
    console.log('Backend URL updated. Reloading page to apply new proxy configuration...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// Validate if a URL is reachable
export async function validateBackendUrl(url: string): Promise<boolean> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const response = await fetch(`${cleanUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Backend validation failed:', error);
    return false;
  }
}

// Get the current effective backend URL
export function getCurrentBackendUrl(): string {
  return getConfig().backendUrl;
}

// Check if we're running in cross-network mode
export function isCrossNetwork(): boolean {
  const config = getConfig();
  const currentHost = window.location.hostname;
  
  try {
    const backendUrl = new URL(config.backendUrl);
    const backendHost = backendUrl.hostname;
    
    // If backend host is different from current host, we're in cross-network mode
    return currentHost !== backendHost && backendHost !== 'localhost' && backendHost !== '127.0.0.1';
  } catch (error) {
    return false;
  }
}

// Network discovery helper for finding backend on local network
export async function discoverBackends(): Promise<string[]> {
  const discovered: string[] = [];
  const currentHost = window.location.hostname;
  
  // If we're on localhost, try common local network ranges
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    const baseIp = '192.168.1'; // Common home network range
    const promises: Promise<void>[] = [];
    
    for (let i = 1; i <= 254; i++) {
      const testUrl = `http://${baseIp}.${i}:3001`;
      
      promises.push(
        validateBackendUrl(testUrl).then(isValid => {
          if (isValid) {
            discovered.push(testUrl);
          }
        }).catch(() => {
          // Ignore errors during discovery
        })
      );
    }
    
    // Wait for all discovery attempts with a timeout
    await Promise.allSettled(promises);
  }
  
  return discovered.sort();
}
