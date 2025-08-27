import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import Button from './ui/Button';
import Input from './ui/Input';
import LiveIndicator from './ui/LiveIndicator';

import { AudioEngine } from '@/audio/AudioEngine';
const AudioSystem: React.FC = () => {
  const {
    audioContext,
    audioStream,
    audioEnabled,
    microphoneLevel,
    speakerLevel,
    audioDevices,
    selectedMicrophone,
    selectedSpeaker,
    config,
    setAudioContext,
    setAudioStream,
    setAudioEnabled,
    setMicrophoneLevel,
    setSpeakerLevel,
    setAudioDevices,
    setSelectedMicrophone,
    setSelectedSpeaker,
    updateConfig,
    addToast,
  } = useAppStore();

  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [vuMeterMic, setVuMeterMic] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const engineRef = useRef<AudioEngine | null>(null);

  // Start cross-platform audio engine on mount
  useEffect(() => {
    const engine = new AudioEngine({
      onAvailable: (available) => {
        if (!available) {
          addToast({ type: 'warning', title: 'Audio transport unavailable', message: 'Server missing ffmpeg. Install ffmpeg for audio streaming.' });
        } else {
          addToast({ type: 'success', title: 'Audio ready', message: 'Cross-platform audio streaming enabled' });
        }
      },
      onConnected: () => {
        addToast({ type: 'success', title: 'Audio connected', message: 'Receiving radio audio' });
      },
      onError: (msg) => addToast({ type: 'error', title: 'Audio error', message: msg })
    });
    engineRef.current = engine;
    if (audioElRef.current) engine.attachOutputElement(audioElRef.current);
    engine.start().catch(() => {/* ignore */});

    // Listen for PTT events from RadioInterface
    const handlePTTChange = (event: CustomEvent) => {
      const { enabled } = event.detail;
      engine.setPTT(enabled).catch(console.error);
    };

    window.addEventListener('ptt-change', handlePTTChange as EventListener);

    return () => {
      window.removeEventListener('ptt-change', handlePTTChange as EventListener);
      engine.stop().catch(() => {});
    };
  }, [addToast]);

  const [vuMeterSpeaker, setVuMeterSpeaker] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Get audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        setAudioDevices([...audioInputs, ...audioOutputs]);

        // Create audio context
        const context = new AudioContext();
        setAudioContext(context);

        addToast({
          type: 'success',
          title: 'Audio System Ready',
          message: `Found ${audioInputs.length} inputs, ${audioOutputs.length} outputs`,
          duration: 3000,
        });
      } catch (error) {
        console.error('Audio initialization failed:', error);
        addToast({
          type: 'error',
          title: 'Audio System Error',
          message: 'Failed to initialize audio system',
        });
      }
    };

    initAudio();

    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // VU Meter animation
  useEffect(() => {
    if (!analyserRef.current || !audioEnabled) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateVuMeter = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = (average / 255) * 100;
      setVuMeterMic(normalizedLevel);
      animationRef.current = requestAnimationFrame(updateVuMeter);
    };

    updateVuMeter();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioEnabled, analyserRef.current]);

  const startAudio = async () => {
    try {
      if (!audioContext) return;

      const constraints = {
        audio: {
          deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: config.audio.enableAGC,
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setAudioStream(stream);

      // Start mic capture for the audio engine
      if (engineRef.current) {
        await engineRef.current.startMicCapture(selectedMicrophone || undefined);
      }

      // Create analyser for VU meter
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setAudioEnabled(true);
      addToast({
        type: 'success',
        title: 'Audio Started',
        message: 'Microphone active - ready for TX/RX streaming',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to start audio:', error);
      addToast({
        type: 'error',
        title: 'Audio Error',
        message: 'Failed to access microphone',
      });
    }
  };

  const stopAudio = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
    setAudioEnabled(false);
    setVuMeterMic(0);
    addToast({
      type: 'info',
      title: 'Audio Stopped',
      message: 'Microphone is now inactive',
      duration: 2000,
    });
  };

  const handleMicrophoneChange = (deviceId: string) => {
    setSelectedMicrophone(deviceId);
    if (audioEnabled) {
      stopAudio();
      setTimeout(startAudio, 100); // Restart with new device
    }
  };

  const handleVolumeChange = (type: 'mic' | 'speaker', value: number) => {
    if (type === 'mic') {
      setMicrophoneLevel(value);
      updateConfig({
        audio: { ...config.audio, micGain: value }
      });
    } else {
      setSpeakerLevel(value);
      updateConfig({
        audio: { ...config.audio, speakerVolume: value }
      });
    }
  };

  const getVuMeterColor = (level: number): string => {
    if (level < 30) return 'bg-green-500';
    if (level < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const microphones = audioDevices.filter(device => device.kind === 'audioinput');
  const speakers = audioDevices.filter(device => device.kind === 'audiooutput');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Audio System
        </h3>
        <div className="flex items-center space-x-2">
          <LiveIndicator
            active={audioEnabled}
            label="Audio Active"
            color="green"
            pulse={true}
          />
          {audioEnabled ? (
            <Button variant="danger" size="sm" onClick={stopAudio}>
              Stop Audio
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={startAudio}>
              Start Audio
            </Button>
          )}
        </div>
      </div>

      {/* Audio Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Microphone Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Microphone</h4>

          {/* Device Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Input Device
            </label>
            <select
              value={selectedMicrophone || ''}
              onChange={(e) => handleMicrophoneChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Default Microphone</option>
              {microphones.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Microphone Gain
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {microphoneLevel}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={microphoneLevel}
              onChange={(e) => handleVolumeChange('mic', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* VU Meter */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Input Level
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMicMuted(!micMuted)}
                className={micMuted ? 'text-red-500' : ''}
              >
                {micMuted ? 'Unmute' : 'Mute'}
              </Button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${getVuMeterColor(vuMeterMic)}`}
                style={{ width: `${Math.min(vuMeterMic, 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                {Math.round(vuMeterMic)}%
              </div>
            </div>
          </div>
        </div>

        {/* Speaker Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Speaker</h4>

          {/* Device Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Output Device
            </label>
            <select
              value={selectedSpeaker || ''}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Default Speaker</option>
              {speakers.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Speaker Volume
              </label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {speakerLevel}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={speakerLevel}
              onChange={(e) => handleVolumeChange('speaker', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Output Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Output Level
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSpeakerMuted(!speakerMuted)}
                className={speakerMuted ? 'text-red-500' : ''}
              >
                {speakerMuted ? 'Unmute' : 'Mute'}
              </Button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${getVuMeterColor(vuMeterSpeaker)}`}
                style={{ width: `${Math.min(vuMeterSpeaker, 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                {Math.round(vuMeterSpeaker)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Processing Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Audio Processing</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.audio.enableAGC}
              onChange={(e) => updateConfig({
                audio: { ...config.audio, enableAGC: e.target.checked }
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">AGC</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.audio.enableNoiseBlanker}
              onChange={(e) => updateConfig({
                audio: { ...config.audio, enableNoiseBlanker: e.target.checked }
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Noise Blanker</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.audio.enableNoiseReduction}
              onChange={(e) => updateConfig({
                audio: { ...config.audio, enableNoiseReduction: e.target.checked }
              })}
              className="mr-2"
            />
            {/* Hidden audio element for radio RX playback */}
            <audio ref={audioElRef as any} className="hidden" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Noise Reduction</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => e.target.checked ? startAudio() : stopAudio()}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Audio Enable</span>
          </label>
        </div>
      </div>

      {/* Audio Status */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <div className="font-medium mb-2">Audio System Status:</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>Sample Rate: {audioContext?.sampleRate || 'N/A'} Hz</div>
            <div>State: {audioContext?.state || 'Not initialized'}</div>
            <div>Devices: {audioDevices.length} total</div>
            <div>Stream: {audioStream ? 'Active' : 'Inactive'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioSystem;
