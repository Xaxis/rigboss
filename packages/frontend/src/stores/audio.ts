import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AudioState, AudioDevice } from '@/types';

interface AudioStore extends AudioState {
  // Actions
  setInputDevices: (devices: AudioDevice[]) => void;
  setOutputDevices: (devices: AudioDevice[]) => void;
  setSelectedInputDevice: (deviceId: string | null) => void;
  setSelectedOutputDevice: (deviceId: string | null) => void;
  setInputLevel: (level: number) => void;
  setOutputLevel: (level: number) => void;
  setMuted: (muted: boolean) => void;
  setRecording: (recording: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setConnected: (connected: boolean) => void;
  
  // Audio operations
  startAudio: () => Promise<void>;
  stopAudio: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  refreshDevices: () => Promise<void>;
  testAudio: () => Promise<void>;
  updateLevels: (levels: { input: number; output: number }) => void;
  
  // Internal state
  audioContext: AudioContext | null;
  inputStream: MediaStream | null;
  outputNode: AudioNode | null;
  analyserNode: AnalyserNode | null;
}

const initialState: AudioState = {
  inputDevices: [],
  outputDevices: [],
  selectedInputDevice: null,
  selectedOutputDevice: null,
  inputLevel: 50,
  outputLevel: 75,
  muted: false,
  recording: false,
  playing: false,
  connected: false,
};

export const useAudioStore = create<AudioStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    audioContext: null,
    inputStream: null,
    outputNode: null,
    analyserNode: null,

    setInputDevices: (devices: AudioDevice[]) => set({ inputDevices: devices }),
    setOutputDevices: (devices: AudioDevice[]) => set({ outputDevices: devices }),
    setSelectedInputDevice: (deviceId: string | null) => set({ selectedInputDevice: deviceId }),
    setSelectedOutputDevice: (deviceId: string | null) => set({ selectedOutputDevice: deviceId }),
    setInputLevel: (level: number) => set({ inputLevel: level }),
    setOutputLevel: (level: number) => set({ outputLevel: level }),
    setMuted: (muted: boolean) => set({ muted }),
    setRecording: (recording: boolean) => set({ recording }),
    setPlaying: (playing: boolean) => set({ playing }),
    setConnected: (connected: boolean) => set({ connected }),

    refreshDevices: async () => {
      try {
        // Request permissions first
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device =>
          device.kind === 'audioinput' || device.kind === 'audiooutput'
        );

        const inputDevices: AudioDevice[] = audioDevices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            id: device.deviceId || `input-${Math.random().toString(36).substr(2, 9)}`,
            label: device.label || `Microphone ${device.deviceId?.slice(0, 8) || 'Unknown'}`,
            kind: 'audioinput',
            groupId: device.groupId || '',
          }));

        const outputDevices: AudioDevice[] = audioDevices
          .filter(device => device.kind === 'audiooutput')
          .map(device => ({
            id: device.deviceId || `output-${Math.random().toString(36).substr(2, 9)}`,
            label: device.label || `Speaker ${device.deviceId?.slice(0, 8) || 'Unknown'}`,
            kind: 'audiooutput',
            groupId: device.groupId || '',
          }));

        set({ inputDevices, outputDevices });

        // Auto-select default devices if none selected
        const state = get();
        if (!state.selectedInputDevice && inputDevices.length > 0) {
          set({ selectedInputDevice: inputDevices[0].id });
        }
        if (!state.selectedOutputDevice && outputDevices.length > 0) {
          set({ selectedOutputDevice: outputDevices[0].id });
        }
      } catch (error) {
        console.error('Failed to refresh audio devices:', error);
        // Set empty arrays instead of throwing to prevent crashes
        set({ inputDevices: [], outputDevices: [] });
      }
    },

    startAudio: async () => {
      try {
        const state = get();
        
        // Create audio context if not exists
        if (!state.audioContext) {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          set({ audioContext });
        }

        // Get user media for input
        if (state.selectedInputDevice) {
          const constraints = {
            audio: {
              deviceId: { exact: state.selectedInputDevice },
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          set({ inputStream: stream });

          // Create analyser for level monitoring
          const audioContext = get().audioContext!;
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          
          set({ analyserNode: analyser, connected: true });
        }
      } catch (error) {
        console.error('Failed to start audio:', error);
        throw error;
      }
    },

    stopAudio: () => {
      const state = get();
      
      if (state.inputStream) {
        state.inputStream.getTracks().forEach(track => track.stop());
      }
      
      if (state.audioContext) {
        state.audioContext.close();
      }

      set({
        inputStream: null,
        audioContext: null,
        outputNode: null,
        analyserNode: null,
        connected: false,
        recording: false,
        playing: false,
      });
    },

    startRecording: async () => {
      const state = get();
      if (!state.inputStream) {
        throw new Error('No input stream available');
      }

      try {
        // Send recording command to backend
        const response = await fetch('/api/audio/start-recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputDeviceId: state.selectedInputDevice,
            inputLevel: state.inputLevel,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start recording');
        }

        set({ recording: true });
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    },

    stopRecording: async () => {
      try {
        await fetch('/api/audio/stop-recording', {
          method: 'POST',
        });

        set({ recording: false });
      } catch (error) {
        console.error('Failed to stop recording:', error);
        throw error;
      }
    },

    testAudio: async () => {
      const state = get();
      if (!state.audioContext) {
        throw new Error('Audio context not initialized');
      }

      try {
        // Generate a test tone
        const audioContext = state.audioContext;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime); // 1kHz tone
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5); // 500ms tone

        set({ playing: true });
        setTimeout(() => set({ playing: false }), 500);
      } catch (error) {
        console.error('Failed to test audio:', error);
        throw error;
      }
    },

    updateLevels: (levels: { input: number; output: number }) => {
      set({
        inputLevel: levels.input,
        outputLevel: levels.output,
      });
    },
  }))
);

// Selectors for optimized subscriptions
export const useAudioInputDevices = () => useAudioStore((state) => state.inputDevices);
export const useAudioOutputDevices = () => useAudioStore((state) => state.outputDevices);
export const useAudioSelectedInputDevice = () => useAudioStore((state) => state.selectedInputDevice);
export const useAudioSelectedOutputDevice = () => useAudioStore((state) => state.selectedOutputDevice);
export const useAudioInputLevel = () => useAudioStore((state) => state.inputLevel);
export const useAudioOutputLevel = () => useAudioStore((state) => state.outputLevel);
export const useAudioMuted = () => useAudioStore((state) => state.muted);
export const useAudioRecording = () => useAudioStore((state) => state.recording);
export const useAudioPlaying = () => useAudioStore((state) => state.playing);
export const useAudioConnected = () => useAudioStore((state) => state.connected);
