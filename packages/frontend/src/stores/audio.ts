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

  // Separate meter levels for display (0-1)
  inputMeterLevel: 0,
  outputMeterLevel: 0,
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
    setOutputLevel: (level: number) => {
      set({ outputLevel: level });
      // Update master gain node if it exists
      import('../services/websocket').then(({ getWebSocketService }) => {
        const ws = getWebSocketService();
        if (ws.masterGainNode) {
          ws.masterGainNode.gain.value = level / 100;
        }
      });
    },
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
        // Create audio context first
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Resume audio context if suspended (required for user interaction)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        set({ audioContext, connected: true });

        // Start backend audio service
        const { getWebSocketService } = await import('../services/websocket');
        const ws = getWebSocketService();

        await ws.emitWithAck('audio:start', {});

        // Get user media for input (TX audio) and start monitoring
        try {
          const constraints = {
            audio: {
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

          // Start microphone level monitoring
          get().startMicrophoneMonitoring(analyser);
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
      // Legacy method - kept for compatibility
      set((state) => ({
        ...state,
        inputMeterLevel: levels.input,
        outputMeterLevel: levels.output,
      }));
    },

    updateMeterLevels: (levels: { outputRMS?: number; outputPeak?: number; inputRMS?: number; inputPeak?: number }) => {
      // Update ONLY meter levels, never volume controls
      const state = get();
      const newOutputLevel = levels.outputRMS ?? state.outputMeterLevel;
      const newInputLevel = levels.inputRMS ?? state.inputMeterLevel;

      // Only update if values changed significantly (prevent excessive updates)
      if (Math.abs(newOutputLevel - state.outputMeterLevel) > 0.05 ||
          Math.abs(newInputLevel - state.inputMeterLevel) > 0.05) {
        set({
          outputMeterLevel: newOutputLevel,
          inputMeterLevel: newInputLevel,
        });
      }
    },

    // Start microphone level monitoring
    startMicrophoneMonitoring: (analyser: AnalyserNode) => {
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdateTime = 0;

      const updateLevel = (timestamp: number) => {
        // Throttle updates to 30fps to prevent excessive re-renders
        if (timestamp - lastUpdateTime < 33) {
          if (useAudioStore.getState().connected) {
            requestAnimationFrame(updateLevel);
          }
          return;
        }
        lastUpdateTime = timestamp;

        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS level from time domain data (better for voice detection)
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const sample = (dataArray[i] - 128) / 128; // Convert to -1 to 1
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);

        // Update input meter level with boosted sensitivity for voice
        useAudioStore.getState().updateMeterLevels({ inputRMS: rms * 5 });

        // Continue monitoring
        if (useAudioStore.getState().connected) {
          requestAnimationFrame(updateLevel);
        }
      };

      requestAnimationFrame(updateLevel);
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
export const useAudioInputMeterLevel = () => useAudioStore((state) => state.inputMeterLevel);
export const useAudioOutputMeterLevel = () => useAudioStore((state) => state.outputMeterLevel);
export const useAudioMuted = () => useAudioStore((state) => state.muted);
export const useAudioRecording = () => useAudioStore((state) => state.recording);
export const useAudioPlaying = () => useAudioStore((state) => state.playing);
export const useAudioConnected = () => useAudioStore((state) => state.connected);
