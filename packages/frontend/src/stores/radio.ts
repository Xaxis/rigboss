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
      try {
        const response = await apiCall('/api/radio/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`Connection failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (result.success) {
          set({ connected: true });
          
          // Update radio info if provided
          if (result.data) {
            set({
              model: result.data.model || '',
              serialNumber: result.data.serialNumber || '',
              firmwareVersion: result.data.firmwareVersion || '',
            });
          }
          
          // Fetch initial radio state
          get().fetchStatus();
        } else {
          throw new Error(result.error || 'Connection failed');
        }
      } catch (error) {
        console.error('Radio connection failed:', error);
        set({ connected: false });
        throw error;
      }
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
        const response = await apiCall('/api/radio/frequency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frequency }),
        });
        
        if (!response.ok) {
          set({ frequency: oldFrequency }); // Revert on error
          throw new Error('Failed to set frequency');
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
        const response = await fetch('/api/radio/mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        
        if (!response.ok) {
          set({ mode: oldMode }); // Revert on error
          throw new Error('Failed to set mode');
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
        const response = await fetch('/api/radio/power', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ power }),
        });
        
        if (!response.ok) {
          set({ power: oldPower }); // Revert on error
          throw new Error('Failed to set power');
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
        const response = await fetch('/api/radio/vfo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vfo }),
        });
        
        if (!response.ok) {
          set({ vfo: oldVFO }); // Revert on error
          throw new Error('Failed to set VFO');
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
        const response = await fetch('/api/radio/split', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ split }),
        });
        
        if (!response.ok) {
          set({ split: oldSplit }); // Revert on error
          throw new Error('Failed to set split');
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
        const response = await fetch('/api/radio/ptt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ptt }),
        });
        
        if (!response.ok) {
          set({ ptt: oldPTT }); // Revert on error
          throw new Error('Failed to set PTT');
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
        const response = await fetch('/api/radio/tune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tuning }),
        });
        
        if (!response.ok) {
          set({ tuning: oldTuning }); // Revert on error
          throw new Error('Failed to set tuning');
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
      console.log('🔧 Radio store updating from backend:', data);
      set((state) => ({ ...state, ...data }));
      console.log('✅ Radio store updated');
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
