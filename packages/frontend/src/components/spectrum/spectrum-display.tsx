import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useSpectrumStore } from '@/stores/spectrum';
import { SpectrumCanvas } from './spectrum-canvas';
import { SpectrumOverlay } from './spectrum-overlay';
import { SpectrumMarkers } from './spectrum-markers';
import type { SpectrumFrame, SpectrumSettings, SpectrumMode } from '@/types';

interface SpectrumDisplayProps {
  frame: SpectrumFrame | null;
  settings: SpectrumSettings;
  mode: SpectrumMode;
  radioFreq?: number;
  variant: 'full' | 'mini' | 'embedded' | 'fullscreen';
  width: number;
  height: number;
}

export function SpectrumDisplay({
  frame,
  settings,
  mode,
  radioFreq,
  variant,
  width,
  height
}: SpectrumDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; centerHz: number } | null>(null);
  const [markers, setMarkers] = useState<Array<{ id: string; hz: number; type: 'manual' | 'peak' }>>([]);

  const { updateSettings } = useSpectrumStore();

  // Mouse interaction handlers
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !frame) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    if (isDragging && dragStart) {
      // Pan frequency based on drag
      const deltaX = x - dragStart.x;
      const hzPerPixel = (frame.binSizeHz * frame.bins.length) / width;
      const deltaHz = -deltaX * hzPerPixel; // Negative for natural pan direction
      
      const newCenterHz = Math.max(0, dragStart.centerHz + deltaHz);
      updateSettings({ centerHz: newCenterHz });
    }
  }, [isDragging, dragStart, frame, width, updateSettings]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!frame) return;
    
    if (e.button === 0) { // Left click
      if (e.shiftKey) {
        // Add marker
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const x = e.clientX - rect.left;
          const hzPerPixel = (frame.binSizeHz * frame.bins.length) / width;
          const startHz = frame.startHz;
          const markerHz = startHz + x * hzPerPixel;
          
          const newMarker = {
            id: `marker-${Date.now()}`,
            hz: markerHz,
            type: 'manual' as const
          };
          
          setMarkers(prev => [...prev, newMarker]);
        }
      } else {
        // Start drag
        setIsDragging(true);
        setDragStart({ 
          x: e.clientX, 
          y: e.clientY, 
          centerHz: settings.centerHz 
        });
      }
    } else if (e.button === 2) { // Right click
      // Context menu or tune radio
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const hzPerPixel = (frame.binSizeHz * frame.bins.length) / width;
        const startHz = frame.startHz;
        const tuneHz = startHz + x * hzPerPixel;
        
        // Emit tune command via WebSocket
        import('@/services/websocket').then(({ getWebSocketService }) => {
          const ws = getWebSocketService();
          if (ws.isConnected()) {
            ws.emit('radio:set_frequency', { frequencyHz: tuneHz });
          }
        });
      }
    }
  }, [frame, width, settings.centerHz, updateSettings]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos(null);
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    if (!frame || !mousePos) return;

    // Calculate what frequency the mouse is pointing at in the DISPLAY
    const displayStartHz = settings.centerHz - settings.spanHz / 2;
    const mouseFreq = displayStartHz + (mousePos.x / width) * settings.spanHz;

    // Zoom in/out
    const zoomFactor = e.deltaY > 0 ? 1.2 : 0.8;
    const newSpan = Math.max(1000, Math.min(10000000, settings.spanHz * zoomFactor));

    // Keep mouse frequency in the same position
    const mouseRatio = mousePos.x / width;
    const newCenterHz = mouseFreq - (mouseRatio - 0.5) * newSpan;

    updateSettings({
      spanHz: newSpan,
      centerHz: newCenterHz
    });
  }, [mousePos, width, settings.spanHz, settings.centerHz, updateSettings]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!frame) return;
    
    // Double-click to center on frequency
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const hzPerPixel = (frame.binSizeHz * frame.bins.length) / width;
      const startHz = frame.startHz;
      const centerHz = startHz + x * hzPerPixel;
      
      updateSettings({ centerHz });
    }
  }, [frame, width, updateSettings]);

  // Context menu prevention
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Handle wheel events with proper event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelHandler = (e: WheelEvent) => {
      handleWheel(e);
    };

    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [handleWheel]);

  // Clear markers on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMarkers([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showOverlay = variant !== 'mini';
  const showMarkers = variant !== 'mini';

  return (
    <div 
      ref={containerRef}
      className="relative bg-black rounded-lg overflow-hidden border border-border cursor-crosshair select-none"
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      tabIndex={0}
    >
      {/* Canvas Layer */}
      <SpectrumCanvas
        frame={frame}
        settings={settings}
        mode={mode}
        width={width}
        height={height}
        variant={variant}
      />
      
      {/* Overlay Layer */}
      {showOverlay && (
        <SpectrumOverlay
          frame={frame}
          settings={settings}
          mode={mode}
          radioFreq={radioFreq}
          mousePos={mousePos}
          width={width}
          height={height}
          variant={variant}
        />
      )}
      
      {/* Markers Layer */}
      {showMarkers && (
        <SpectrumMarkers
          frame={frame}
          markers={markers}
          onRemoveMarker={(id) => setMarkers(prev => prev.filter(m => m.id !== id))}
          width={width}
          height={height}
        />
      )}
      
      {/* Mode Indicator */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/80 rounded text-white text-xs font-mono">
        {mode.toUpperCase()}
      </div>
      
      {/* Interaction Hints */}
      {variant === 'full' && (
        <div className="absolute bottom-2 right-2 text-xs text-white/60 font-mono space-y-1">
          <div>Drag: Pan • Wheel: Zoom • Shift+Click: Marker</div>
          <div>Right-Click: Tune • Double-Click: Center</div>
        </div>
      )}
    </div>
  );
}
