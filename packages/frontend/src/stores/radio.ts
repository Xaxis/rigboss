import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getConfig } from '../lib/config';

// Helper function to make API calls to the correct backend
const apiCall = (endpoint: string, options?: RequestInit) => {
  const config = getConfig();
  return fetch(`${config.apiUrl}${endpoint}`, options);
};
import type { RadioState, RadioMode, VFO, RadioInfo, RadioCapabilities } from '@/types';

interface RadioStore extends RadioState {
  // Capabilities
  capabilities: RadioCapabilities | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  setFrequency: (frequency: number) => void;
  setMode: (mode: string, bandwidthHz?: number) => void;
  setPower: (power: number) => void;
  setVFO: (vfo: string) => void;
  setSplit: (split: boolean) => void;
  setPTT: (ptt: boolean) => void;
  setTuning: (tuning: boolean) => void;
  tune: (ms?: number) => void;
  fetchStatus: () => Promise<void>;
  updateFromBackend: (data: Partial<RadioState>) => void;
  updateCapabilities: (capabilities: RadioCapabilities) => void;
}

const initialState: RadioState = {
  connected: false,
  // Core frequency/mode/power
  frequencyHz: 14074000,
  mode: 'USB',
  bandwidthHz: 2400,
  power: 50,
  ptt: false,
  tuning: false,

  // VFO operations
  vfo: 'VFOA',
  split: false,

  // Levels
  swr: 1.0,
  signalStrength: -120,

  // Rig info
  rigModel: 'Connecting...',
  serialNumber: '',
  firmwareVersion: '',
};

export const useRadioStore = create<RadioStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Capabilities
    capabilities: null,

    connect: async () => {
      const { getWebSocketService } = await import('../services/websocket');
      const ws = getWebSocketService();
      // Let backend choose correct default (127.0.0.1:4532 on Pi)
      await ws.emitWithAck('radio:connect');
      set({ connected: true });
    },

    disconnect: async () => {
      try {
        await apiCall('/api/radio/disconnect', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Disconnect error:', error);
      } finally {
        set({ 
          connected: false,
          ptt: false,
          tuning: false,
        });
      }
    },

    setFrequency: async (frequency: number) => {
      // Ensure frequency precision (round to nearest Hz)
      const preciseFrequency = Math.round(frequency);
      const oldFrequency = get().frequencyHz;
      set({ frequencyHz: preciseFrequency }); // Optimistic update

      // Sync spectrum analyzer if coupled
      import('../stores/spectrum').then(({ useSpectrumStore }) => {
        const spectrumStore = useSpectrumStore.getState();
        if (spectrumStore.settings.coupled) {
          spectrumStore.updateSettings({ centerHz: preciseFrequency });
        }
      });

      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setFrequency', { frequency: preciseFrequency });
        } catch (e) {
          set({ frequencyHz: oldFrequency });
          throw e;
        }
      } catch (error) {
        console.error('Set frequency error:', error);
        set({ frequencyHz: oldFrequency });
      }
    },

    setMode: async (mode: string, bandwidthHz?: number) => {
      const oldMode = get().mode;
      const oldBandwidth = get().bandwidthHz;
      set({ mode, ...(bandwidthHz && { bandwidthHz }) }); // Optimistic update

      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setMode', { mode, bandwidthHz });
        } catch (e) {
          set({ mode: oldMode, bandwidthHz: oldBandwidth });
          throw e;
        }
      } catch (error) {
        console.error('Set mode error:', error);
        set({ mode: oldMode, bandwidthHz: oldBandwidth });
      }
    },

    setPower: async (power: number) => {
      const oldPower = get().power;
      set({ power }); // Optimistic update
      
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setPower', { power });
        } catch (e) {
          set({ power: oldPower });
          throw e;
        }
      } catch (error) {
        console.error('Set power error:', error);
        set({ power: oldPower });
      }
    },

    setVFO: async (vfo: string) => {
      const oldVFO = get().vfo;
      set({ vfo }); // Optimistic update

      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setVFO', { vfo });
        } catch (e) {
          set({ vfo: oldVFO });
          throw e;
        }
      } catch (error) {
        console.error('Set VFO error:', error);
        set({ vfo: oldVFO });
      }
    },

    setSplit: async (split: boolean) => {
      const oldSplit = get().split;
      set({ split }); // Optimistic update
      
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setSplit', { split });
        } catch (e) {
          set({ split: oldSplit });
          throw e;
        }
      } catch (error) {
        console.error('Set split error:', error);
        set({ split: oldSplit });
      }
    },

    setPTT: async (ptt: boolean) => {
      const oldPTT = get().ptt;
      set({ ptt }); // Optimistic update
      
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setPTT', { ptt });
        } catch (e) {
          set({ ptt: oldPTT });
          throw e;
        }
      } catch (error) {
        console.error('Set PTT error:', error);
        set({ ptt: oldPTT });
      }
    },

    setTuning: async (tuning: boolean) => {
      const oldTuning = get().tuning;
      set({ tuning }); // Optimistic update
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        if (tuning) {
          await ws.emitWithAck('radio:tune', { ms: 1200 });
        }
      } catch (error) {
        console.error('Set tuning error:', error);
        set({ tuning: oldTuning });
      }
    },

    tune: async (ms = 1200) => {
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        await ws.emitWithAck('radio:tune', { ms });
      } catch (error) {
        console.error('Tune error:', error);
      }
    },

    fetchStatus: async () => {
      try {
        const response = await fetch('/api/radio/state');
        if (response.ok) {
          const result = await response.json();
          set(result);
        }
      } catch (error) {
        console.error('Fetch status error:', error);
      }
    },

    updateFromBackend: (data: Partial<RadioState>) => {
      const currentState = get();

      // Sync spectrum analyzer if frequency changed and coupled
      if (data.frequencyHz && data.frequencyHz !== currentState.frequencyHz) {
        import('../stores/spectrum').then(({ useSpectrumStore }) => {
          const spectrumStore = useSpectrumStore.getState();
          if (spectrumStore.settings.coupled) {
            spectrumStore.updateSettings({ centerHz: data.frequencyHz });
          }
        });
      }

      // Simple, reliable state update
      set((state) => ({ ...state, ...data }));
    },

    updateCapabilities: (capabilities: RadioCapabilities) => {
      set({ capabilities });
    },
  }))
);

// Selectors for optimized subscriptions
export const useRadioConnected = () => useRadioStore((state) => state.connected);
export const useRadioFrequency = () => useRadioStore((state) => state.frequencyHz);
export const useRadioMode = () => useRadioStore((state) => state.mode);
export const useRadioPower = () => useRadioStore((state) => state.power);
export const useRadioVFO = () => useRadioStore((state) => state.vfo);
export const useRadioSplit = () => useRadioStore((state) => state.split);
export const useRadioPTT = () => useRadioStore((state) => state.ptt);
export const useRadioTuning = () => useRadioStore((state) => state.tuning);
export const useRadioSWR = () => useRadioStore((state) => state.swr);
export const useRadioSignalStrength = () => useRadioStore((state) => state.signalStrength);
export const useRadioModel = () => useRadioStore((state) => state.rigModel);
export const useRadioSerialNumber = () => useRadioStore((state) => state.serialNumber);
export const useRadioFirmwareVersion = () => useRadioStore((state) => state.firmwareVersion);
