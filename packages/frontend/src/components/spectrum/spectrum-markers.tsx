import React from 'react';
import { X } from 'lucide-react';
import type { SpectrumFrame } from '@/types';

interface Marker {
  id: string;
  hz: number;
  type: 'manual' | 'peak';
}

interface SpectrumMarkersProps {
  frame: SpectrumFrame | null;
  markers: Marker[];
  onRemoveMarker: (id: string) => void;
  width: number;
  height: number;
}

export function SpectrumMarkers({
  frame,
  markers,
  onRemoveMarker,
  width,
  height
}: SpectrumMarkersProps) {
  if (!frame || markers.length === 0) return null;

  const startHz = frame.startHz;
  const endHz = startHz + frame.binSizeHz * frame.bins.length;
  const spanHz = endHz - startHz;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {markers.map((marker, index) => {
        // Only show markers that are within the current span
        if (marker.hz < startHz || marker.hz > endHz) return null;

        const x = ((marker.hz - startHz) / spanHz) * width;
        const markerColor = marker.type === 'peak' ? '#ff6b35' : '#00d4ff';

        // Find amplitude at marker frequency
        const binIndex = Math.floor(((marker.hz - startHz) / spanHz) * frame.bins.length);
        const amplitude = frame.bins[binIndex];

        return (
          <div key={marker.id}>
            {/* Marker Line */}
            <div
              className="absolute top-0 w-0.5 opacity-90 z-20"
              style={{
                left: x,
                height: '50%', // Only show in spectrum area
                backgroundColor: markerColor,
                boxShadow: `0 0 4px ${markerColor}`
              }}
            />

            {/* Marker Label */}
            <div
              className="absolute pointer-events-auto z-30"
              style={{
                left: Math.min(x + 5, width - 120),
                top: 10 + index * 25
              }}
            >
              <div
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-white"
                style={{ backgroundColor: markerColor + 'dd' }}
              >
                <span>M{index + 1}</span>
                <span>{(marker.hz / 1000000).toFixed(6)} MHz</span>
                {typeof amplitude === 'number' && (
                  <span>{amplitude.toFixed(1)} dB</span>
                )}
                <button
                  onClick={() => onRemoveMarker(marker.id)}
                  className="ml-1 hover:bg-white/20 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Marker Triangle */}
            <div
              className="absolute w-0 h-0 z-20"
              style={{
                left: x - 4,
                top: -1,
                borderLeft: '4px solid transparent',
                borderRight: '4px solid transparent',
                borderBottom: `8px solid ${markerColor}`
              }}
            />
          </div>
        );
      })}

      {/* Delta measurements between markers */}
      {markers.length >= 2 && (
        <div className="absolute top-2 left-2 bg-black/80 text-white text-xs font-mono px-2 py-1 rounded z-30">
          <div className="space-y-1">
            {markers.slice(1).map((marker, index) => {
              const refMarker = markers[0];
              const deltaHz = marker.hz - refMarker.hz;
              const refBinIndex = Math.floor(((refMarker.hz - startHz) / spanHz) * frame.bins.length);
              const markerBinIndex = Math.floor(((marker.hz - startHz) / spanHz) * frame.bins.length);
              const refAmplitude = frame.bins[refBinIndex];
              const markerAmplitude = frame.bins[markerBinIndex];
              const deltaDb = typeof refAmplitude === 'number' && typeof markerAmplitude === 'number' 
                ? markerAmplitude - refAmplitude 
                : null;

              return (
                <div key={`delta-${index}`}>
                  M{index + 2} - M1: {(deltaHz / 1000).toFixed(3)} kHz
                  {deltaDb !== null && `, ${deltaDb > 0 ? '+' : ''}${deltaDb.toFixed(1)} dB`}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
