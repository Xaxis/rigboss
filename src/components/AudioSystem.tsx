import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { AudioEngine } from '@/audio/AudioEngine';
import RadioAudioControls from './RadioAudioControls';

const AudioSystem: React.FC = () => {
  const {
    config,
    updateConfig,
    addToast,
    audioEngine,
    audioEnabled: isAudioActive,
    isTransmitting,
    rxAudioLevel: rxLevel,
    microphoneLevel: micLevel,
    audioDevices,
    selectedMicrophone,
    selectedSpeaker,
    setAudioDevices,
    setSelectedMicrophone,
    setSelectedSpeaker,
    initGlobalAudioEngine,
    startGlobalAudio,
    stopGlobalAudio
  } = useAppStore();

  // Refs
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio devices
  useEffect(() => {
    const initAudio = async () => {
      if (typeof window === 'undefined') return;

      // Try to get devices directly - browsers usually allow this even without HTTPS

      if (!window.navigator?.mediaDevices) {
        console.warn('Media devices API not available');
        addToast({
          type: 'error',
          title: 'Audio Not Supported',
          message: 'Your browser does not support audio device access.'
        });
        return;
      }

      try {
        // Request permission first to get device labels
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Got microphone permission');
        } catch (permError) {
          console.warn('Microphone permission denied, device labels may be limited');
        }

        // Get all devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log('Found devices:', devices);

        // Stop the permission stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        setAudioDevices(devices);

        // Auto-select first available devices
        const mics = devices.filter(d => d.kind === 'audioinput');
        const speakers = devices.filter(d => d.kind === 'audiooutput');

        console.log('Microphones found:', mics.length);
        console.log('Speakers found:', speakers.length);

        if (mics.length > 0 && (!selectedMicrophone || selectedMicrophone === '')) {
          setSelectedMicrophone(mics[0].deviceId);
          console.log('Auto-selected microphone:', mics[0]);
        }
        if (speakers.length > 0 && (!selectedSpeaker || selectedSpeaker === '')) {
          setSelectedSpeaker(speakers[0].deviceId);
          console.log('Auto-selected speaker:', speakers[0]);
        }

        if (mics.length === 0) {
          addToast({
            type: 'error',
            title: 'No Microphones Found',
            message: 'No microphones detected. Check device connections and browser permissions.'
          });
        }

        if (speakers.length === 0) {
          addToast({
            type: 'warning',
            title: 'No Speakers Found',
            message: 'No speakers detected. Audio will use default output.'
          });
        }
      } catch (error) {
        console.error('Failed to get audio devices:', error);
        addToast({
          type: 'error',
          title: 'Audio Device Error',
          message: 'Cannot access audio devices. Check browser settings.'
        });
      }
    };

    const timer = setTimeout(initAudio, 500);
    return () => clearTimeout(timer);
  }, [addToast]);

  // Initialize global audio engine
  useEffect(() => {
    initGlobalAudioEngine();

    // Attach audio element if available
    if (audioElRef.current && audioEngine) {
      audioEngine.attachOutputElement(audioElRef.current);
    }
  }, [initGlobalAudioEngine, audioEngine]);

  // Use global audio functions
  const startAudio = startGlobalAudio;
  const stopAudio = stopGlobalAudio;

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
              Your laptop microphone → Pi → Radio transmits | Radio receives → Pi → Your laptop speakers
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Audio devices below are your laptop's microphone and speakers (not the radio's)
            </p>
          </div>
          <button
            onClick={isAudioActive ? stopAudio : startAudio}
            disabled={!selectedMicrophone || selectedMicrophone === ''}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              isAudioActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : (selectedMicrophone && selectedMicrophone !== '')
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
          >
            {isAudioActive ? '🔇 Stop Audio' : '🎧 Start Audio'}
          </button>
        </div>

      </div>

      {/* Radio Audio Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Radio Audio Status</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* RX Status */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${isAudioActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-900 dark:text-white">RX: Radio → Your Speakers</span>
            </div>
            {isAudioActive ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Audio Level:</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(100, rxLevel)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-10">{Math.round(rxLevel)}%</span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">✓ Receiving radio audio</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Start audio to receive radio</p>
            )}
          </div>

          {/* TX Status */}
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className={`w-4 h-4 rounded-full ${isTransmitting ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="font-medium text-gray-900 dark:text-white">TX: Your Mic → Radio</span>
            </div>
            {isTransmitting ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mic Level:</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(100, micLevel)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-10">{Math.round(micLevel)}%</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">🔴 TRANSMITTING TO RADIO</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Press PTT to transmit</p>
            )}
          </div>
        </div>
      </div>

      {/* Computer Audio Setup */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Computer Audio Setup</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure your laptop/computer's microphone and speakers for radio operation
        </p>

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
                value={selectedMicrophone || ''}
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
                value={selectedSpeaker || ''}
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

          {(!selectedMicrophone || selectedMicrophone === '') && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Please select a microphone to enable audio streaming
              </p>
            </div>
          )}

          {audioDevices.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ No audio devices detected. Check browser permissions or try refreshing the page.
              </p>
            </div>
          )}

          {microphones.length === 0 && audioDevices.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                ❌ No microphones found. Audio transmission will not work.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Radio Audio Controls */}
      <RadioAudioControls />

      {/* Audio Quality & Connection Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Audio Connection Info</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Audio Format</div>
            <div className="text-gray-600 dark:text-gray-400">48kHz, 16-bit PCM</div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Connection</div>
            <div className="text-gray-600 dark:text-gray-400">
              {isAudioActive ? '🟢 WebSocket Active' : '🔴 Disconnected'}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Latency</div>
            <div className="text-gray-600 dark:text-gray-400">~100-200ms</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>💡 Audio Path:</strong> Your computer ↔ Network ↔ Pi ↔ USB ↔ Radio
          </p>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio ref={audioElRef} className="hidden" />
    </div>
  );
};

export default AudioSystem;
