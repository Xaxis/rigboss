import { create } from 'zustand';

export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
  channels: number;
  sampleRate: number;
  isDefault: boolean;
}

// CONTROL STORE - User settings and controls (stable, rarely changes)
interface AudioControlState {
  // Device management
  availableDevices: AudioDevice[];
  selectedInputDevice: string | null;
  selectedOutputDevice: string | null;
  
  // User controls (0-100)
  inputLevel: number;
  outputLevel: number;
  muted: boolean;
  connected: boolean;

  // Audio context
  audioContext: AudioContext | null;
  inputStream: MediaStream | null;

  // Actions
  refreshDevices: () => Promise<void>;
  setInputLevel: (level: number) => void;
  setOutputLevel: (level: number) => void;
  setMuted: (muted: boolean) => void;
  startAudio: () => Promise<void>;
  stopAudio: () => void;
}

// DISPLAY STORE - Level meters only (changes frequently)
interface AudioDisplayState {
  inputMeterLevel: number;
  outputMeterLevel: number;
  updateLevels: (levels: { input?: number; output?: number }) => void;
}

// CONTROL STORE - Stable state
export const useAudioControlStore = create<AudioControlState>((set, get) => ({
  // Initial state
  availableDevices: [],
  selectedInputDevice: null,
  selectedOutputDevice: null,
  inputLevel: 50,
  outputLevel: 30,
  muted: false,
  connected: false,
  audioContext: null,
  inputStream: null,

  // Actions
  refreshDevices: async () => {
    try {
      const { getWebSocketService } = await import('../services/websocket');
      const ws = getWebSocketService();

      // Wait for WebSocket to be connected
      if (!ws.socket?.connected) {
        console.log('WebSocket not ready, will retry when connected');
        // Set default devices for now
        set({
          availableDevices: [
            { id: 'sysdefault:CARD=CODEC', name: 'Radio Audio Interface', type: 'input', channels: 1, sampleRate: 48000, isDefault: true },
            { id: 'default', name: 'Computer Speakers', type: 'output', channels: 2, sampleRate: 48000, isDefault: true },
            { id: 'default', name: 'Computer Microphone', type: 'input', channels: 1, sampleRate: 48000, isDefault: false }
          ]
        });
        return;
      }

      const response = await ws.emitWithAck('audio:get_devices', {});
      console.log('Audio devices response:', response);

      // Backend returns { devices: [...] } or { devices: null }
      if (response && Array.isArray(response.devices)) {
        set({ availableDevices: response.devices });
      } else {
        console.warn('Backend returned no devices or invalid format:', response);
        throw new Error('No devices available from backend');
      }
    } catch (error) {
      console.warn('Failed to refresh audio devices:', error);
      // Set default devices if WebSocket fails
      set({
        availableDevices: [
          { id: 'sysdefault:CARD=CODEC', name: 'Radio Audio Interface', type: 'input', channels: 1, sampleRate: 48000, isDefault: true },
          { id: 'default', name: 'Computer Speakers', type: 'output', channels: 2, sampleRate: 48000, isDefault: true },
          { id: 'default', name: 'Computer Microphone', type: 'input', channels: 1, sampleRate: 48000, isDefault: false }
        ]
      });
    }
  },

  setInputLevel: (level: number) => {
    set({ inputLevel: level });
    // Update WebSocket master gain if it exists
    import('../services/websocket').then(({ getWebSocketService }) => {
      const ws = getWebSocketService();
      if (ws.masterGainNode) {
        ws.masterGainNode.gain.value = level / 100;
      }
    });
  },

  setOutputLevel: (level: number) => {
    set({ outputLevel: level });
    // Update WebSocket master gain if it exists
    import('../services/websocket').then(({ getWebSocketService }) => {
      const ws = getWebSocketService();
      if (ws.masterGainNode) {
        ws.masterGainNode.gain.value = level / 100;
      }
    });
  },

  setMuted: (muted: boolean) => {
    set({ muted });
    // Update WebSocket master gain if it exists
    import('../services/websocket').then(({ getWebSocketService }) => {
      const ws = getWebSocketService();
      if (ws.masterGainNode) {
        ws.masterGainNode.gain.value = muted ? 0 : get().outputLevel / 100;
      }
    });
  },

  startAudio: async () => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      set({ audioContext, connected: true });

      // Start backend audio service
      const { getWebSocketService } = await import('../services/websocket');
      const ws = getWebSocketService();
      await ws.emitWithAck('audio:start', {});

      // Get microphone for TX monitoring
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        set({ inputStream: stream });
        
        // Start microphone monitoring
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        
        startMicrophoneMonitoring(analyser);
      } catch (micError) {
        console.warn('Microphone access failed:', micError);
      }
    } catch (error) {
      console.error('Failed to start audio:', error);
      set({ connected: false });
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
      connected: false, 
      audioContext: null, 
      inputStream: null 
    });
  },
}));

// DISPLAY STORE - Frequently changing level data
export const useAudioDisplayStore = create<AudioDisplayState>((set) => ({
  inputMeterLevel: 0,
  outputMeterLevel: 0,

  updateLevels: (levels: { input?: number; output?: number }) => {
    set((state) => ({
      inputMeterLevel: levels.input ?? state.inputMeterLevel,
      outputMeterLevel: levels.output ?? state.outputMeterLevel,
    }));
  },
}));

// Microphone monitoring function
function startMicrophoneMonitoring(analyser: AnalyserNode) {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let lastUpdate = 0;
  
  const updateLevel = (timestamp: number) => {
    // Throttle to 10fps
    if (timestamp - lastUpdate < 100) {
      if (useAudioControlStore.getState().connected) {
        requestAnimationFrame(updateLevel);
      }
      return;
    }
    lastUpdate = timestamp;
    
    analyser.getByteTimeDomainData(dataArray);
    
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const sample = (dataArray[i] - 128) / 128;
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);
    
    useAudioDisplayStore.getState().updateLevels({ input: rms * 3 });
    
    if (useAudioControlStore.getState().connected) {
      requestAnimationFrame(updateLevel);
    }
  };
  
  requestAnimationFrame(updateLevel);
}

// Convenience selectors
export const useAudioConnected = () => useAudioControlStore((state) => state.connected);
export const useAudioOutputLevel = () => useAudioControlStore((state) => state.outputLevel);
export const useAudioInputLevel = () => useAudioControlStore((state) => state.inputLevel);
export const useAudioMuted = () => useAudioControlStore((state) => state.muted);
export const useAudioOutputMeterLevel = () => useAudioDisplayStore((state) => state.outputMeterLevel);
export const useAudioInputMeterLevel = () => useAudioDisplayStore((state) => state.inputMeterLevel);
