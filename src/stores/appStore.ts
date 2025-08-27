import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RadioState, AppConfig, ActivityLog } from '@/types/radio';
import type { ToastProps } from '@/components/ui/Toast';
import { AudioEngine } from '@/audio/AudioEngine';

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
  audioEngine: AudioEngine | null;
  audioContext: AudioContext | null;
  audioStream: MediaStream | null;
  audioEnabled: boolean;
  microphoneLevel: number;
  speakerLevel: number;
  rxAudioLevel: number;
  audioDevices: MediaDeviceInfo[];
  selectedMicrophone: string;
  selectedSpeaker: string;
  setAudioEngine: (engine: AudioEngine | null) => void;
  setAudioContext: (context: AudioContext | null) => void;
  setAudioStream: (stream: MediaStream | null) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setMicrophoneLevel: (level: number) => void;
  setSpeakerLevel: (level: number) => void;
  setRxAudioLevel: (level: number) => void;
  setAudioDevices: (devices: MediaDeviceInfo[]) => void;
  setSelectedMicrophone: (deviceId: string) => void;
  setSelectedSpeaker: (deviceId: string) => void;
  initGlobalAudioEngine: () => void;
  startGlobalAudio: () => Promise<void>;
  stopGlobalAudio: () => void;

  // Activity logs
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  // Spectrum modal state
  activeSpectrumModal?: 'combined' | 'spectrum' | 'waterfall' | null;
  setActiveSpectrumModal?: (mode: 'combined' | 'spectrum' | 'waterfall' | null) => void;

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

	      // Spectrum modal
	      activeSpectrumModal: null,
	      setActiveSpectrumModal: (mode) => set({ activeSpectrumModal: mode }),

      setLastCommand: (command) => set({ lastCommand: command, lastUpdate: Date.now() }),

      // Audio system state
      audioEngine: null,
      audioContext: null,
      audioStream: null,
      audioEnabled: false,
      microphoneLevel: 0,
      speakerLevel: 0,
      rxAudioLevel: 0,
      audioDevices: [],
      selectedMicrophone: '',
      selectedSpeaker: '',
      setAudioEngine: (engine) => set({ audioEngine: engine }),
      setAudioContext: (context) => set({ audioContext: context }),
      setAudioStream: (stream) => set({ audioStream: stream }),
      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
      setMicrophoneLevel: (level) => set({ microphoneLevel: level }),
      setSpeakerLevel: (level) => set({ speakerLevel: level }),
      setRxAudioLevel: (level) => set({ rxAudioLevel: level }),
      setAudioDevices: (devices) => set({ audioDevices: devices }),
      setSelectedMicrophone: (deviceId) => set({ selectedMicrophone: deviceId }),
      setSelectedSpeaker: (deviceId) => set({ selectedSpeaker: deviceId }),

      // Global audio engine management
      initGlobalAudioEngine: () => {
        const state = get();
        if (state.audioEngine) return; // Already initialized

        const engine = new AudioEngine({
          onAvailable: (available) => {
            if (!available) {
              state.addToast({ type: 'warning', title: 'Audio Unavailable', message: 'Server audio not available' });
            }
          },
          onConnected: () => {
            set({ audioEnabled: true });
            state.addToast({ type: 'success', title: 'Audio Connected', message: 'Radio audio streaming active' });
          },
          onError: (msg) => {
            set({ audioEnabled: false });
            state.addToast({ type: 'error', title: 'Audio Error', message: msg });
          },
          onRxLevel: (level) => set({ rxAudioLevel: level })
        });

        set({ audioEngine: engine });

        // Listen for PTT events
        const handlePTTChange = (event: CustomEvent) => {
          const { enabled } = event.detail;
          set({ isTransmitting: enabled });
          engine.setPTT(enabled).catch(console.error);
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('ptt-change', handlePTTChange as EventListener);
        }
      },

      startGlobalAudio: async () => {
        const state = get();
        if (!state.audioEngine) {
          state.initGlobalAudioEngine();
        }

        try {
          if (state.audioEngine) {
            await state.audioEngine.start();

            // Start mic capture only if a mic is selected; otherwise RX-only
            if (state.selectedMicrophone && state.selectedMicrophone !== '') {
              await state.audioEngine.startMicCapture(state.selectedMicrophone);
            } else {
              state.addToast({ type: 'info', title: 'RX Only', message: 'Microphone not selected. You can hear radio audio; TX is disabled until a mic is chosen.', duration: 3000 });
            }
          }
        } catch (error) {
          state.addToast({ type: 'error', title: 'Audio Failed', message: 'Failed to start audio streaming' });
        }
      },

      stopGlobalAudio: () => {
        const state = get();
        if (state.audioEngine) {
          state.audioEngine.stop();
        }
        set({ audioEnabled: false, rxAudioLevel: 0 });
        state.addToast({ type: 'info', title: 'Audio Stopped', message: 'Radio audio streaming stopped' });
      },

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
