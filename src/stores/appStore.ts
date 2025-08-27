import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RadioState, AppConfig, ActivityLog } from '@/types/radio';
import type { ToastProps } from '@/components/ui/Toast';

interface AppStore {
  // Configuration state
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  
  // Radio state
  radioState: Partial<RadioState>;
  setRadioState: (state: Partial<RadioState>) => void;
  
  // Connection state
  backendConnected: boolean;
  radioConnected: boolean;
  setBackendConnected: (connected: boolean) => void;
  setRadioConnected: (connected: boolean) => void;
  
  // UI state
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeView: string;
  setActiveView: (view: string) => void;
  
  // Error handling
  error: string | null;
  setError: (error: string | null) => void;
  
  // Loading states
  connecting: boolean;
  setConnecting: (connecting: boolean) => void;
  
  // Real-time feedback
  lastUpdate: number;
  setLastUpdate: () => void;

  // Toast notifications
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void;
  removeToast: (id: string) => void;

  // Activity tracking
  isTransmitting: boolean;
  setIsTransmitting: (transmitting: boolean) => void;
  lastCommand: string | null;
  setLastCommand: (command: string) => void;

  // Audio system state
  audioContext: AudioContext | null;
  audioStream: MediaStream | null;
  audioEnabled: boolean;
  microphoneLevel: number;
  speakerLevel: number;
  audioDevices: MediaDeviceInfo[];
  selectedMicrophone: string | null;
  selectedSpeaker: string | null;
  setAudioContext: (context: AudioContext | null) => void;
  setAudioStream: (stream: MediaStream | null) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setMicrophoneLevel: (level: number) => void;
  setSpeakerLevel: (level: number) => void;
  setAudioDevices: (devices: MediaDeviceInfo[]) => void;
  setSelectedMicrophone: (deviceId: string | null) => void;
  setSelectedSpeaker: (deviceId: string | null) => void;

  // Activity logs
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearActivityLogs: () => void;
}

const defaultConfig: AppConfig = {
  radio: {
    model: '',
    port: '',
    baudRate: 9600,
    rigctldHost: 'localhost',
    rigctldPort: 4532,
    pollInterval: 1000,
    audioEnabled: true,
    spectrumEnabled: true,
  },
  audio: {
    inputGain: 50,
    outputGain: 50,
    micGain: 50,
    speakerVolume: 50,
    enableNoiseBlanker: false,
    enableNoiseReduction: false,
    enableAGC: true,
    compressorLevel: 0,
  },
  ui: {
    theme: 'auto' as const,
    touchOptimized: false,
    showSpectrum: true,
    showWaterfall: true,
    frequencyStep: 1000,
  },
  network: {
    serverPort: 3001,
    allowRemoteConnections: false,
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Configuration
      config: defaultConfig,
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
          lastUpdate: Date.now(),
        })),

      // Radio state
      radioState: {},
      setRadioState: (state) =>
        set((prevState) => ({
          radioState: { ...prevState.radioState, ...state },
          lastUpdate: Date.now(),
        })),

      // Connection state
      backendConnected: false,
      radioConnected: false,
      setBackendConnected: (connected) => set({ backendConnected: connected }),
      setRadioConnected: (connected) => set({ radioConnected: connected }),

      // UI state
      activeModal: null,
      setActiveModal: (modal) => set({ activeModal: modal }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      activeView: 'radio',
      setActiveView: (view) => set({ activeView: view }),

      // Error handling
      error: null,
      setError: (error) => set({ error }),

      // Loading states
      connecting: false,
      setConnecting: (connecting) => set({ connecting }),

      // Real-time feedback
      lastUpdate: Date.now(),
      setLastUpdate: () => set({ lastUpdate: Date.now() }),

      // Toast notifications
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id, onClose: get().removeToast };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
      },
      removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) })),

      // Activity tracking
      isTransmitting: false,
      setIsTransmitting: (transmitting) => set({ isTransmitting: transmitting }),
      lastCommand: null,
      setLastCommand: (command) => set({ lastCommand: command, lastUpdate: Date.now() }),

      // Audio system state
      audioContext: null,
      audioStream: null,
      audioEnabled: false,
      microphoneLevel: 0,
      speakerLevel: 0,
      audioDevices: [],
      selectedMicrophone: null,
      selectedSpeaker: null,
      setAudioContext: (context) => set({ audioContext: context }),
      setAudioStream: (stream) => set({ audioStream: stream }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
      setMicrophoneLevel: (level) => set({ microphoneLevel: level }),
      setSpeakerLevel: (level) => set({ speakerLevel: level }),
      setAudioDevices: (devices) => set({ audioDevices: devices }),
      setSelectedMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),
      setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),

      // Activity logs
      activityLogs: [],
      addActivityLog: (log) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newLog = { ...log, id, timestamp: Date.now() };
        set((state) => ({
          activityLogs: [newLog, ...state.activityLogs].slice(0, 1000) // Keep last 1000 logs
        }));
      },
      clearActivityLogs: () => set({ activityLogs: [] }),
    }),
    {
      name: 'rigboss-config',
      partialize: (state) => ({
        config: state.config,
        // Don't persist connection state or UI state
      }),
    }
  )
);

// Selectors for optimized re-renders
export const useRadioState = () => useAppStore((state) => state.radioState);
export const useConnectionState = () => useAppStore((state) => ({
  backendConnected: state.backendConnected,
  radioConnected: state.radioConnected,
}));
export const useConfig = () => useAppStore((state) => state.config);
export const useUIState = () => useAppStore((state) => ({
  activeModal: state.activeModal,
  sidebarOpen: state.sidebarOpen,
  error: state.error,
}));
