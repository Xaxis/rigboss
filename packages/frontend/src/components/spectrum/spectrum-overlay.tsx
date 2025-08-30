import React from 'react';
import type { SpectrumFrame, SpectrumSettings, SpectrumMode } from '@/types';

interface SpectrumOverlayProps {
  frame: SpectrumFrame | null;
  settings: SpectrumSettings;
  mode: SpectrumMode;
  radioFreq?: number;
  mousePos: { x: number; y: number } | null;
  width: number;
  height: number;
  variant: 'full' | 'mini' | 'embedded' | 'fullscreen';
}

export function SpectrumOverlay({
  frame,
  settings,
  mode,
  radioFreq,
  mousePos,
  width,
  height,
  variant
}: SpectrumOverlayProps) {
  if (!frame) return null;

  const startHz = frame.startHz;
  const endHz = startHz + frame.binSizeHz * frame.bins.length;
  const spanHz = endHz - startHz;
  const hzPerPixel = spanHz / width;

  // Calculate display areas for combined mode
  const spectrumHeight = mode === 'combined' ? height / 2 : height;
  const waterfallTop = mode === 'combined' ? height / 2 : 0;
  const waterfallHeight = mode === 'combined' ? height / 2 : height;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Center Frequency Marker */}
      {settings.centerHz >= startHz && settings.centerHz <= endHz && (
        <div
          className="absolute top-0 w-0.5 bg-red-500 opacity-80"
          style={{
            left: ((settings.centerHz - startHz) / spanHz) * width,
            height: mode === 'spectrum' ? '100%' : '50%'
          }}
        >
          {variant !== 'mini' && (
            <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-1 rounded">
              CENTER
            </div>
          )}
        </div>
      )}

      {/* Radio Tuned Frequency Marker */}
      {radioFreq && radioFreq >= startHz && radioFreq <= endHz && (
        <div
          className="absolute top-0 w-0.5 bg-yellow-400 opacity-80"
          style={{
            left: ((radioFreq - startHz) / spanHz) * width,
            height: mode === 'spectrum' ? '100%' : '50%'
          }}
        >
          {variant !== 'mini' && (
            <div className="absolute -top-6 -left-6 bg-yellow-400 text-black text-xs px-1 rounded">
              TUNED
            </div>
          )}
        </div>
      )}



      {/* Mouse Crosshair and Info */}
      {mousePos && (
        <>
          {/* Vertical crosshair */}
          <div
            className="absolute top-0 w-0.5 bg-yellow-300 opacity-60"
            style={{
              left: mousePos.x,
              height: mode === 'spectrum' ? '100%' : '50%'
            }}
          />
          
          {/* Horizontal crosshair (spectrum area only) */}
          {(mode === 'spectrum' || mode === 'combined') && (
            <div
              className="absolute left-0 h-0.5 bg-yellow-300 opacity-60"
              style={{
                top: mousePos.y > spectrumHeight ? spectrumHeight - 1 : mousePos.y,
                width: '100%'
              }}
            />
          )}

          {/* Frequency and amplitude readout */}
          <div
            className="absolute bg-black/90 text-white text-xs font-mono px-2 py-1 rounded border border-yellow-300/50 z-10"
            style={{
              left: Math.min(mousePos.x + 10, width - 160),
              top: Math.max(mousePos.y - 50, 5)
            }}
          >
            <div className="space-y-1">
              <div>
                {((startHz + mousePos.x * hzPerPixel) / 1000000).toFixed(6)} MHz
              </div>
              
              {/* Amplitude readout for spectrum area */}
              {mousePos.y <= spectrumHeight && (() => {
                const binIndex = Math.floor((mousePos.x / width) * frame.bins.length);
                const dbValue = frame.bins[binIndex];
                return typeof dbValue === 'number' ? (
                  <div>{dbValue.toFixed(1)} dB</div>
                ) : null;
              })()}
              
              {/* Delta from radio frequency */}
              {radioFreq && (
                <div className="text-blue-300">
                  Δ {(((startHz + mousePos.x * hzPerPixel) - radioFreq) / 1000).toFixed(3)} kHz
                </div>
              )}
              
              {/* RBW (Resolution Bandwidth) */}
              <div className="text-gray-400">
                RBW: {(frame.binSizeHz / 1000).toFixed(3)} kHz
              </div>
            </div>
          </div>
        </>
      )}

      {/* Scale Information */}
      {variant !== 'mini' && (
        <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs font-mono px-2 py-1 rounded">
          <div className="space-y-1">
            <div>Span: {(spanHz / 1000).toFixed(1)} kHz</div>
            <div>RBW: {(frame.binSizeHz / 1000).toFixed(3)} kHz</div>
            <div>Ref: {settings.refLevel} dB</div>
            {settings.traceMode !== 'live' && (
              <div>Mode: {settings.traceMode.replace('_', ' ').toUpperCase()}</div>
            )}
          </div>
        </div>
      )}

      {/* Coupling Indicator */}
      {settings.coupled && radioFreq && variant !== 'mini' && (
        <div className="absolute top-2 right-2 bg-green-600/80 text-white text-xs font-mono px-2 py-1 rounded">
          COUPLED
        </div>
      )}
    </div>
  );
}
