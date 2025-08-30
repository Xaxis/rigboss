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
  outputLevel: 30,  // Start at 30% so audio is audible when started
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
        console.log('🔊 STARTING AUDIO - Step 1: Create context');

        // Create audio context first
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 AUDIO CONTEXT CREATED:', audioContext.state);

        // Resume audio context if suspended (required for user interaction)
        if (audioContext.state === 'suspended') {
          console.log('🔊 RESUMING SUSPENDED AUDIO CONTEXT');
          await audioContext.resume();
          console.log('🔊 AUDIO CONTEXT RESUMED:', audioContext.state);
        }

        console.log('🔊 STARTING AUDIO - Step 2: Update store');
        set({ audioContext, connected: true });
        console.log('🔊 AUDIO STORE UPDATED - connected:', true);

        console.log('🔊 STARTING AUDIO - Step 3: Start backend');
        // Start backend audio service
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();

        await ws.emitWithAck('audio:start', {});
        console.log('🔊 BACKEND AUDIO STARTED');

        // Get user media for input (TX audio) - optional
        try {
          const state = get();
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
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            set({ analyserNode: analyser });
          }
        } catch (micError) {
          console.warn('Microphone access failed, continuing without TX audio:', micError);
          // Continue without microphone - RX audio still works
        }
      } catch (error) {
        console.error('Failed to start audio:', error);
        set({ connected: false });
        throw error;
      }
    },

    stopAudio: async () => {
      try {
        // Stop backend audio service
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();

        await ws.emitWithAck('audio:stop', {});
      } catch (error) {
        console.error('Failed to stop backend audio:', error);
      }

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
        // Start TX audio capture via WebSocket
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();

        await ws.emitWithAck('audio:start_tx', {
          deviceId: state.selectedInputDevice,
        });

        set({ recording: true });
      } catch (error) {
        console.error('Failed to start recording:', error);
        throw error;
      }
    },

    stopRecording: async () => {
      try {
        // Stop TX audio capture via WebSocket
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();

        await ws.emitWithAck('audio:stop_tx', {});

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
      // DON'T override user volume settings!
      // These are just level meter readings, not volume controls
      // TODO: Add separate meter level state if needed for level meters
      // For now, just ignore these to prevent overriding user volume settings
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
