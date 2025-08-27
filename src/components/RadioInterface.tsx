import React, { useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { socketService } from '@/utils/socket';
import type { RadioMode } from '@/types/radio';
import AppLayout from './layout/AppLayout';
import FrequencyDisplay from './FrequencyDisplay';
import ModeSelector from './ModeSelector';
import PowerControl from './PowerControl';
import PTTButton from './PTTButton';
import BandSelector from './BandSelector';
import MemoryChannels from './MemoryChannels';
import AudioSystem from './AudioSystem';
import { AudioEngine } from '@/audio/AudioEngine';
import ActivityLogs from './ActivityLogs';
import AudioStatus from './ui/AudioStatus';
import Button from './ui/Button';
import CombinedSpectrumView from './spectrum/CombinedSpectrumView';
import { ToastManager } from './ui/Toast';
import SpectrumModal from './modals/SpectrumModal';

const RadioInterface: React.FC = () => {
  const {
    radioState,
    radioConnected,
    setError,
    setActiveModal,
    addToast,
    setLastCommand,
    activeView,
    addActivityLog,
    config,
    toasts,
    removeToast,
    activeSpectrumModal,
    setActiveSpectrumModal,
  } = useAppStore();

  // Radio control handlers

  // Radio control handlers
  const handleFrequencyChange = useCallback(async (frequency: number) => {
    try {
      setError(null);
      setLastCommand(`Set frequency to ${(frequency / 1000000).toFixed(6)} MHz`);
      await socketService.setFrequency(frequency);
      addActivityLog({
        type: 'frequency',
        message: `Frequency changed to ${(frequency / 1000000).toFixed(6)} MHz`,
        success: true,
        details: { frequency }
      });
      addToast({
        type: 'success',
        title: 'Frequency Updated',
        message: `Set to ${(frequency / 1000000).toFixed(6)} MHz`,
        duration: 2000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set frequency';
      setError(message);
      addActivityLog({
        type: 'frequency',
        message: `Failed to set frequency: ${message}`,
        success: false,
        details: { frequency, error: message }
      });
      addToast({
        type: 'error',
        title: 'Frequency Change Failed',
        message,
      });
    }
  }, [setError, setLastCommand, addToast, addActivityLog]);

  const handleBandChange = useCallback(async (frequency: number, mode: RadioMode) => {
    try {
      setError(null);
      setLastCommand(`Band change to ${(frequency / 1000000).toFixed(3)} MHz ${mode}`);
      await socketService.setFrequency(frequency);
      await socketService.setMode(mode);
      addToast({
        type: 'success',
        title: 'Band Changed',
        message: `${(frequency / 1000000).toFixed(3)} MHz ${mode}`,
        duration: 2000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change band';
      setError(message);
      addToast({
        type: 'error',
        title: 'Band Change Failed',
        message,
      });
    }
  }, [setError, setLastCommand, addToast]);

  const handleModeChange = useCallback(async (mode: RadioMode, bandwidth?: number) => {
    try {
      setError(null);
      setLastCommand(`Set mode to ${mode}${bandwidth ? ` (${bandwidth}Hz)` : ''}`);
      await socketService.setMode(mode, bandwidth);
      addActivityLog({
        type: 'mode',
        message: `Mode changed to ${mode}${bandwidth ? ` (${bandwidth}Hz)` : ''}`,
        success: true,
        details: { mode, bandwidth }
      });
      addToast({
        type: 'success',
        title: 'Mode Updated',
        message: `Set to ${mode}${bandwidth ? ` (${bandwidth}Hz)` : ''}`,
        duration: 2000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set mode';
      setError(message);
      addToast({
        type: 'error',
        title: 'Mode Change Failed',
        message,
      });
    }
  }, [setError, setLastCommand, addToast]);

  const handlePowerChange = useCallback(async (power: number) => {
    try {
      setError(null);
      setLastCommand(`Set power to ${power}%`);
      await socketService.setPowerLevel(power);
      addToast({
        type: 'success',
        title: 'Power Updated',
        message: `Set to ${power}%`,
        duration: 2000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set power';
      setError(message);
      addToast({
        type: 'error',
        title: 'Power Change Failed',
        message,
      });
    }
  }, [setError, setLastCommand, addToast]);

  const handlePTTChange = useCallback(async (enabled: boolean) => {
    try {
      setError(null);
      setLastCommand(enabled ? 'PTT ON' : 'PTT OFF');

      // Control both rigctl and audio engine
      await socketService.setPTT(enabled);

      // Also control audio engine PTT for mic transmission
      // Note: AudioEngine instance is in AudioSystem component
      // We'll emit a custom event for now
      window.dispatchEvent(new CustomEvent('ptt-change', { detail: { enabled } }));

      addToast({
        type: enabled ? 'warning' : 'info',
        title: enabled ? 'Transmitting' : 'Receive Mode',
        message: enabled ? 'PTT activated - mic audio streaming' : 'PTT released',
        duration: 1500,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set PTT';
      setError(message);
      addToast({
        type: 'error',
        title: 'PTT Control Failed',
        message,
      });
    }
  }, [setError, setLastCommand, addToast]);



  return (
    <AppLayout>
      {!radioConnected ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-yellow-500 mb-6">
              <svg className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No Radio Connected
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Connect to rigctld to start controlling your amateur radio transceiver.
            </p>
            <Button
              onClick={() => setActiveModal('connection')}
              size="lg"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              }
            >
              Connect to Radio
            </Button>
            <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              <p>Make sure rigctld is running on your target device</p>
              <code className="mt-2 inline-block bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-xs">
                rigctld -m 229 -r /dev/ttyUSB0
              </code>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6 overflow-y-auto">
          {activeView === 'radio' && (
            <>
              {/* Primary Control Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                {/* Frequency Display - Hero Section */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <FrequencyDisplay
                    frequency={radioState.frequency || 0}
                    onChange={handleFrequencyChange}
                  />
                </div>

                {/* Essential Controls Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
                  {/* Mode Control */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <ModeSelector
                      mode={radioState.mode || 'USB'}
                      bandwidth={radioState.bandwidth || 2400}
                      onChange={handleModeChange}
                    />
                  </div>

                  {/* Power Control */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <PowerControl
                      power={radioState.power || 0}
                      maxPower={100}
                      onChange={handlePowerChange}
                    />
                  </div>

                  {/* PTT Button */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <PTTButton
                      active={radioState.ptt || false}
                      onChange={handlePTTChange}
                    />
                  </div>

                  {/* Audio Status */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <AudioStatus />
                  </div>
                </div>
              </div>

              {/* Mini Spectrum (if enabled) */}
              {config.ui.showSpectrum && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Live Spectrum (Preview)
                    </h3>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setActiveSpectrumModal && setActiveSpectrumModal('combined')}>Open Full Screen</Button>
                    </div>
                  </div>
                  <div className="h-[220px]">
                    <CombinedSpectrumView height={200} />
                  </div>
                </div>
              )}

              {/* Additional Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radio Info */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Radio Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Model:</span>
                      <span className="text-gray-900 dark:text-white">{radioState.model || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Frequency:</span>
                      <span className="text-gray-900 dark:text-white frequency-display">
                        {radioState.frequency ? `${(radioState.frequency / 1000000).toFixed(6)} MHz` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                      <span className="text-gray-900 dark:text-white">{radioState.mode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Power:</span>
                      <span className="text-gray-900 dark:text-white">{radioState.power || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" onClick={() => handleBandChange(14200000, 'USB')}>
                      20m Band
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBandChange(7150000, 'LSB')}>
                      40m Band
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBandChange(3750000, 'LSB')}>
                      80m Band
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveModal('settings')}>
                      Settings
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeView === 'bands' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <BandSelector
                currentFrequency={radioState.frequency || 0}
                onBandChange={handleBandChange}
              />
            </div>
          )}

          {activeView === 'memory' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <MemoryChannels
                currentFrequency={radioState.frequency || 0}
                currentMode={radioState.mode || 'USB'}
                onRecall={handleBandChange}
              />
            </div>
          )}

          {activeView === 'spectrum' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Spectrum & Waterfall</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActiveSpectrumModal && setActiveSpectrumModal('combined')}>Full Screen</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveSpectrumModal && setActiveSpectrumModal('spectrum')}>Spectrum</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveSpectrumModal && setActiveSpectrumModal('waterfall')}>Waterfall</Button>
                </div>
              </div>
              <div className="h-[480px]">
                <CombinedSpectrumView height={460} />
              </div>
            </div>
          )}

          {activeView === 'audio' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <AudioSystem />
            </div>
          )}

          {/* Spectrum Fullscreen Modal */}
          <SpectrumModal
            open={!!activeSpectrumModal}
            mode={(activeSpectrumModal || 'combined') as any}
            onClose={() => setActiveSpectrumModal && setActiveSpectrumModal(null)}
          />

          {activeView === 'logs' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <ActivityLogs />
            </div>
          )}
        </div>
      )}

      {/* Toast Notifications */}
      <ToastManager toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  );
};

export default RadioInterface;
