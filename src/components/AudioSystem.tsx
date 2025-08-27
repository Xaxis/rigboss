import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { AudioEngine } from '@/audio/AudioEngine';

const AudioSystem: React.FC = () => {
  const { config, updateConfig, addToast } = useAppStore();
  
  // Audio state
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [rxLevel, setRxLevel] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  
  // Refs
  const engineRef = useRef<AudioEngine | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio devices
  useEffect(() => {
    const initAudio = async () => {
      if (typeof window === 'undefined' || !window.navigator?.mediaDevices) return;
      
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices);
        
        // Auto-select first available devices
        const mics = devices.filter(d => d.kind === 'audioinput');
        const speakers = devices.filter(d => d.kind === 'audiooutput');
        
        if (mics.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(mics[0].deviceId);
        }
        if (speakers.length > 0 && !selectedSpeaker) {
          setSelectedSpeaker(speakers[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to get audio devices:', error);
      }
    };

    const timer = setTimeout(initAudio, 100);
    return () => clearTimeout(timer);
  }, [selectedMicrophone, selectedSpeaker]);

  // Initialize audio engine
  useEffect(() => {
    const engine = new AudioEngine({
      onAvailable: (available) => {
        if (!available) {
          addToast({ type: 'warning', title: 'Audio Unavailable', message: 'Server audio not available' });
        }
      },
      onConnected: () => {
        setIsAudioActive(true);
        addToast({ type: 'success', title: 'Audio Connected', message: 'Radio audio streaming active' });
      },
      onError: (msg) => {
        setIsAudioActive(false);
        addToast({ type: 'error', title: 'Audio Error', message: msg });
      },
      onRxLevel: (level) => setRxLevel(level)
    });
    
    engineRef.current = engine;
    if (audioElRef.current) engine.attachOutputElement(audioElRef.current);

    // Listen for PTT events
    const handlePTTChange = (event: CustomEvent) => {
      const { enabled } = event.detail;
      setIsTransmitting(enabled);
      engine.setPTT(enabled).catch(console.error);
    };

    window.addEventListener('ptt-change', handlePTTChange as EventListener);

    return () => { 
      window.removeEventListener('ptt-change', handlePTTChange as EventListener);
      engine.stop().catch(() => {}); 
    };
  }, [addToast]);

  // Start audio streaming
  const startAudio = async () => {
    if (!selectedMicrophone) {
      addToast({ type: 'error', title: 'No Microphone', message: 'Please select a microphone first' });
      return;
    }

    try {
      if (engineRef.current) {
        await engineRef.current.start();
        await engineRef.current.startMicCapture(selectedMicrophone);
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Audio Failed', message: 'Failed to start audio streaming' });
    }
  };

  // Stop audio streaming
  const stopAudio = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsAudioActive(false);
    setRxLevel(0);
    addToast({ type: 'info', title: 'Audio Stopped', message: 'Radio audio streaming stopped' });
  };

  const microphones = audioDevices.filter(d => d.kind === 'audioinput');
  const speakers = audioDevices.filter(d => d.kind === 'audiooutput');

  return (
    <div className="space-y-6">
      {/* Main Control */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Radio Audio</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Talk into your laptop mic → Radio transmits | Radio receives → Your laptop speakers
            </p>
          </div>
          <button
            onClick={isAudioActive ? stopAudio : startAudio}
            disabled={!selectedMicrophone}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isAudioActive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : selectedMicrophone
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {isAudioActive ? '🔇 Stop Audio' : '🎧 Start Audio'}
          </button>
        </div>

        {/* Status Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* RX Status */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${isAudioActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-900 dark:text-white">Radio → Your Speakers</span>
            </div>
            {isAudioActive ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Level:</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(100, rxLevel)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-10">{Math.round(rxLevel)}%</span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">✓ You can hear the radio</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Click "Start Audio" to hear radio</p>
            )}
          </div>

          {/* TX Status */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${isTransmitting ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-900 dark:text-white">Your Mic → Radio</span>
            </div>
            {isTransmitting ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Level:</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(100, micLevel)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-10">{Math.round(micLevel)}%</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">🔴 TRANSMITTING</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Press PTT button to transmit</p>
            )}
          </div>
        </div>

        {/* Device Setup */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">Audio Setup</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Microphone Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🎤 Your Microphone
              </label>
              <select
                value={selectedMicrophone}
                onChange={(e) => setSelectedMicrophone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select microphone...</option>
                {microphones.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the microphone you'll speak into for radio transmission
              </p>
            </div>

            {/* Speaker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔊 Your Speakers
              </label>
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Default speakers</option>
                {speakers.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose where you want to hear radio audio
              </p>
            </div>
          </div>

          {!selectedMicrophone && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Please select a microphone to enable audio streaming
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Audio Controls</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Volume
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.audio.volume}
              onChange={(e) => updateConfig('audio', { ...config.audio, volume: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{config.audio.volume}%</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Microphone Gain
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.audio.micGain}
              onChange={(e) => updateConfig('audio', { ...config.audio, micGain: parseInt(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{config.audio.micGain}%</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.audio.enableAGC}
                onChange={(e) => updateConfig('audio', { ...config.audio, enableAGC: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto Gain Control</span>
            </label>
          </div>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioElRef} className="hidden" />
    </div>
  );
};

export default AudioSystem;
