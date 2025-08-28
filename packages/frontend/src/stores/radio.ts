import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { getConfig } from '../lib/config';

// Helper function to make API calls to the correct backend
const apiCall = (endpoint: string, options?: RequestInit) => {
  const config = getConfig();
  return fetch(`${config.apiUrl}${endpoint}`, options);
};
import type { RadioState, RadioMode, VFO, RadioInfo } from '@/types';

interface RadioStore extends RadioState {
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  setFrequency: (frequency: number) => void;
  setMode: (mode: RadioMode) => void;
  setPower: (power: number) => void;
  setVFO: (vfo: VFO) => void;
  setSplit: (split: boolean) => void;
  setPTT: (ptt: boolean) => void;
  setTuning: (tuning: boolean) => void;
  fetchStatus: () => Promise<void>;
  updateFromBackend: (data: Partial<RadioState>) => void;
}

const initialState: RadioState = {
  connected: false,
  frequency: 0, // Will be updated from backend
  mode: 'USB',
  power: 0, // Will be updated from backend
  vfo: 'A',
  split: false,
  ptt: false,
  tuning: false,
  swr: 0, // Will be updated from backend
  signalStrength: 0, // Will be updated from backend
  model: 'Connecting...',
  serialNumber: '',
  firmwareVersion: '',
};

export const useRadioStore = create<RadioStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

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
      const oldFrequency = get().frequency;
      set({ frequency }); // Optimistic update
      
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setFrequency', { frequency });
        } catch (e) {
          set({ frequency: oldFrequency });
          throw e;
        }
      } catch (error) {
        console.error('Set frequency error:', error);
        set({ frequency: oldFrequency });
      }
    },

    setMode: async (mode: RadioMode) => {
      const oldMode = get().mode;
      set({ mode }); // Optimistic update
      
      try {
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();
        try {
          await ws.emitWithAck('radio:setMode', { mode });
        } catch (e) {
          set({ mode: oldMode });
          throw e;
        }
      } catch (error) {
        console.error('Set mode error:', error);
        set({ mode: oldMode });
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

    setVFO: async (vfo: VFO) => {
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

    fetchStatus: async () => {
      try {
        const response = await fetch('/api/radio/status');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            set(result.data);
          }
        }
      } catch (error) {
        console.error('Fetch status error:', error);
      }
    },

    updateFromBackend: (data: Partial<RadioState>) => {
      // Map backend fields to store
      const mapped: Partial<RadioState> = {
        connected: data.connected ?? get().connected,
        frequency: (data as any).frequency ?? (data as any).frequencyHz ?? get().frequency,
        mode: (data as any).mode ?? get().mode,
        bandwidthHz: typeof (data as any).bandwidthHz === 'number' ? (data as any).bandwidthHz : get().bandwidthHz,
        power: typeof (data as any).power === 'number' ? (data as any).power : get().power,
        ptt: typeof (data as any).ptt === 'boolean' ? (data as any).ptt : get().ptt,
        model: (data as any).rigModel ?? get().model,
        swr: typeof (data as any).swr === 'number' ? (data as any).swr : get().swr,
        signalStrength: typeof (data as any).signalStrength === 'number' ? (data as any).signalStrength : get().signalStrength,
      };
      set((state) => ({ ...state, ...mapped }));
    },
  }))
);

// Selectors for optimized subscriptions
export const useRadioConnected = () => useRadioStore((state) => state.connected);
export const useRadioFrequency = () => useRadioStore((state) => state.frequency);
export const useRadioMode = () => useRadioStore((state) => state.mode);
export const useRadioPower = () => useRadioStore((state) => state.power);
export const useRadioVFO = () => useRadioStore((state) => state.vfo);
export const useRadioSplit = () => useRadioStore((state) => state.split);
export const useRadioPTT = () => useRadioStore((state) => state.ptt);
export const useRadioTuning = () => useRadioStore((state) => state.tuning);
export const useRadioSWR = () => useRadioStore((state) => state.swr);
export const useRadioSignalStrength = () => useRadioStore((state) => state.signalStrength);
export const useRadioModel = () => useRadioStore((state) => state.model);
export const useRadioSerialNumber = () => useRadioStore((state) => state.serialNumber);
export const useRadioFirmwareVersion = () => useRadioStore((state) => state.firmwareVersion);
