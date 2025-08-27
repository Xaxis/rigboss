// Centralized backend URL configuration
// Allows dynamic configuration via UI while using .env as default

class BackendConfig {
  private _baseUrl: string;
  private _listeners: Set<(url: string) => void> = new Set();
  private _initialized = false;

  constructor() {
    // Default fallback URL
    this._baseUrl = 'http://localhost:3001';
  }

  private initialize() {
    if (this._initialized || typeof window === 'undefined') return;

    // Default URL logic (client-side only)
    const currentHost = window.location.hostname;
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      this._baseUrl = 'http://localhost:3001';
    } else {
      this._baseUrl = `http://${currentHost}:3001`;
    }

    // Override with environment variable if available
    if ((window as any).__BACKEND_URL__) {
      this._baseUrl = (window as any).__BACKEND_URL__;
    }

    this._initialized = true;
  }

  get baseUrl(): string {
    this.initialize();
    return this._baseUrl;
  }

  get apiUrl(): string {
    this.initialize();
    return `${this._baseUrl}/api`;
  }

  get socketUrl(): string {
    this.initialize();
    return this._baseUrl;
  }

  get audioUrl(): string {
    this.initialize();
    return `${this._baseUrl}/audio`;
  }

  get spectrumUrl(): string {
    this.initialize();
    return `${this._baseUrl}/spectrum`;
  }

  // Update the backend URL (called from UI)
  setBackendUrl(url: string): void {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    // Remove trailing slash
    url = url.replace(/\/$/, '');

    // Add port if not specified
    if (!url.match(/:\d+$/)) {
      url = `${url}:3001`;
    }

    this._baseUrl = url;
    
    // Notify listeners of URL change
    this._listeners.forEach(listener => listener(url));
  }

  // Subscribe to URL changes
  onUrlChange(callback: (url: string) => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  // Test if a backend URL is reachable
  async testConnection(url?: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    this.initialize();
    const testUrl = url || this._baseUrl;
    try {
      const response = await fetch(`${testUrl}/api/health`, {
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance (client-side only)
let backendConfig: BackendConfig;

if (typeof window !== 'undefined') {
  backendConfig = new BackendConfig();
} else {
  // Server-side fallback
  backendConfig = {
    get baseUrl() { return 'http://localhost:3001'; },
    get apiUrl() { return 'http://localhost:3001/api'; },
    get socketUrl() { return 'http://localhost:3001'; },
    get audioUrl() { return 'http://localhost:3001/audio'; },
    get spectrumUrl() { return 'http://localhost:3001/spectrum'; },
    setBackendUrl() {},
    onUrlChange() { return () => {}; },
    async testConnection() { return false; }
  } as any;
}

export { backendConfig };
export default backendConfig;
