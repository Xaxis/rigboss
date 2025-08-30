import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SpectrumState, SpectrumSettings, SpectrumFrame, SpectrumSource, SpectrumMode } from '@/types';

interface SpectrumStore extends SpectrumState {
  // Actions
  updateSettings: (settings: Partial<SpectrumSettings>) => void;
  updateFrame: (frame: SpectrumFrame) => void;
  setSource: (source: SpectrumSource) => void;
  setMode: (mode: SpectrumMode) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setConnected: (connected: boolean) => void;
  autoDetectSource: () => Promise<SpectrumSource>;
  reset: () => void;
}

const initialSettings: SpectrumSettings = {
  centerHz: 14200000, // 20m band default
  spanHz: 100000, // 100 kHz span
  fftSize: 2048,
  averaging: 3,
  refLevel: 0,
  colorMap: 'viridis',
};

const initialState: SpectrumState = {
  settings: initialSettings,
  frame: null,
  connected: false,
  source: 'AUTO',
  fullscreen: false,
  mode: 'combined',
};

export const useSpectrumStore = create<SpectrumStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    updateSettings: (newSettings: Partial<SpectrumSettings>) => {
      const currentSettings = get().settings;
      const updatedSettings = { ...currentSettings, ...newSettings };
      set({ settings: updatedSettings });

      // Send settings to backend via WebSocket only
      import('../services/websocket').then(({ getWebSocketService }) => {
        getWebSocketService().emit('spectrum:settings:set', updatedSettings);
      });
    },

    updateFrame: (frame: SpectrumFrame) => {
      set({ frame });
    },

    setSource: (source: SpectrumSource) => {
      set({ source });
      // Send via WebSocket as part of settings
      import('../services/websocket').then(({ getWebSocketService }) => {
        getWebSocketService().emit('spectrum:settings:set', { source });
      });
    },

    setMode: (mode: SpectrumMode) => {
      set({ mode });
    },

    setFullscreen: (fullscreen: boolean) => {
      set({ fullscreen });
    },

    setConnected: (connected: boolean) => {
      set({ connected });
    },

    autoDetectSource: async (): Promise<SpectrumSource> => {
      // WebSocket-only: let backend choose source; assume PCM fallback
      const fallbackSource: SpectrumSource = 'PCM';
      set({ source: fallbackSource });
      import('../services/websocket').then(({ getWebSocketService }) => {
        getWebSocketService().emit('spectrum:settings:set', { source: 'AUTO' });
      });
      return fallbackSource;
    },

    reset: () => {
      set({ ...initialState });
    },
  }))
);

// Selectors for optimized subscriptions
export const useSpectrumSettings = () => useSpectrumStore((state) => state.settings);
export const useSpectrumFrame = () => useSpectrumStore((state) => state.frame);
export const useSpectrumConnected = () => useSpectrumStore((state) => state.connected);
export const useSpectrumSource = () => useSpectrumStore((state) => state.source);
export const useSpectrumMode = () => useSpectrumStore((state) => state.mode);
export const useSpectrumFullscreen = () => useSpectrumStore((state) => state.fullscreen);
