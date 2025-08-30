import React, { useRef, useEffect, useState } from 'react';
import { useSpectrumFrame, useSpectrumSettings, useSpectrumMode } from '@/stores/spectrum';
import { dbToColor } from '@/lib/utils';
import { useRadioStore } from '@/stores/radio';

export function SpectrumCanvas() {
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const waterfallRef = useRef<HTMLCanvasElement>(null);
  const frame = useSpectrumFrame();
  const settings = useSpectrumSettings();
  const mode = useSpectrumMode();
  const tunedHz = useRadioStore((s) => s.frequencyHz);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Render spectrum
  useEffect(() => {
    if (!frame || !spectrumRef.current) return;

    const canvas = spectrumRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== rect.width * dpr) canvas.width = rect.width * dpr;
    if (canvas.height !== rect.height * dpr) canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw spectrum curve
    drawSpectrum(ctx, frame, settings, width, height);

    // Grid & markers
    drawFrequencyGrid(ctx, settings, width, height, frame);
    drawCenterAndTunedMarkers(ctx, settings, width, height, frame, tunedHz);

    // Cursor
    if (mousePos) drawCursorInfo(ctx, mousePos, settings, width, height);
  }, [frame, settings, mode, mousePos, tunedHz]);

  // Render waterfall
  useEffect(() => {
    if (!frame || !waterfallRef.current) return;
    const canvas = waterfallRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.max(1, Math.floor(rect.width * dpr));
    const targetH = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== targetW) canvas.width = targetW;
    if (canvas.height !== targetH) canvas.height = targetH;

    // Scroll existing image up by 1 row
    const row = 1; // px per frame; could be adjustable by speed
    ctx.drawImage(canvas, 0, 0, targetW, targetH - row, 0, row, targetW, targetH - row);

    // Draw new row at top using current bins
    const bins = frame.bins as number[];
    const img = ctx.createImageData(targetW, row);
    const buf = img.data;
    for (let x = 0; x < targetW; x++) {
      const i = Math.floor((x / targetW) * bins.length);
      const color = dbToColor(bins[i], settings.colorMap);
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      for (let y = 0; y < row; y++) {
        const idx = (y * targetW + x) * 4;
        buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, settings]);

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    frame: any,
    settings: any,
    width: number,
    height: number
  ) => {
    const bins = frame?.bins as number[] | undefined;
    if (!bins || bins.length === 0) return;

    const maxDb = settings.refLevel;
    const minDb = maxDb - 80; // 80dB dynamic range

    // Anti-aliased spectrum line
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < bins.length; i++) {
      const x = (i / bins.length) * width;
      const normalizedDb = Math.max(0, Math.min(1, (bins[i] - minDb) / (maxDb - minDb)));
      const y = height - (normalizedDb * height);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill under curve
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
  };

  const drawFrequencyGrid = (
    ctx: CanvasRenderingContext2D,
    settings: any,
    width: number,
    height: number,
    frame: any
  ) => {
    const startHz = frame.startHz;
    const endHz = startHz + frame.binSizeHz * frame.bins.length;
    const hzPerPixel = (endHz - startHz) / width;

    // Vertical grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;

    const gridSpacing = (endHz - startHz) / 10;
    for (let i = 0; i <= 10; i++) {
      const hz = startHz + i * gridSpacing;
      const x = (hz - startHz) / hzPerPixel;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Frequency labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      const freqLabel = (hz / 1000000).toFixed(3) + ' MHz';
      ctx.fillText(freqLabel, x, height - 5);
    }

    // Horizontal grid lines (dB scale)
    const dbRange = 80;
    for (let db = -80; db <= 0; db += 10) {
      const y = height - ((db + 80) / dbRange) * height;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // dB labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${db} dB`, 5, y - 2);
    }
  };

  const drawCenterAndTunedMarkers = (
    ctx: CanvasRenderingContext2D,
    settings: any,
    width: number,
    height: number,
    frame: any,
    tunedHz?: number
  ) => {
    const startHz = frame.startHz;
    const endHz = startHz + frame.binSizeHz * frame.bins.length;
    const hzPerPixel = (endHz - startHz) / width;

    // Center marker (red)
    const centerHz = settings.centerHz;
    if (centerHz >= startHz && centerHz <= endHz) {
      const x = (centerHz - startHz) / hzPerPixel;
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#ff4444';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CENTER', x, 15);
    }

    // Tuned frequency marker (yellow)
    if (tunedHz && tunedHz >= startHz && tunedHz <= endHz) {
      const x = (tunedHz - startHz) / hzPerPixel;
      ctx.strokeStyle = '#ffff44';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#ffff44';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TUNED', x, 30);
    }
  };

  const drawCursorInfo = (
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    settings: any,
    width: number,
    height: number
  ) => {
    if (!frame) return;
    const startHz = frame.startHz;
    const endHz = startHz + frame.binSizeHz * frame.bins.length;
    const hzPerPixel = (endHz - startHz) / width;
    const frequency = startHz + mousePos.x * hzPerPixel;

    // Crosshair
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.beginPath();
    ctx.moveTo(mousePos.x, 0);
    ctx.lineTo(mousePos.x, height);
    ctx.moveTo(0, mousePos.y);
    ctx.lineTo(width, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Info box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(mousePos.x + 10, mousePos.y - 35, 140, 30);

    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${(frequency / 1000000).toFixed(3)} MHz`, mousePos.x + 15, mousePos.y - 15);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = spectrumRef.current?.getBoundingClientRect();
    if (!rect) return;

    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    setZoomLevel(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
  };

  const spectrumHeight = mode === 'combined' ? '50%' : '100%';
  const waterfallHeight = mode === 'combined' ? '50%' : '100%';
  const showSpectrum = mode === 'spectrum' || mode === 'combined';
  const showWaterfall = mode === 'waterfall' || mode === 'combined';

  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden flex flex-col">
      {/* Spectrum canvas */}
      {showSpectrum && (
        <canvas
          ref={spectrumRef}
          className="w-full cursor-crosshair"
          style={{ height: spectrumHeight }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
      )}

      {/* Waterfall canvas */}
      {showWaterfall && (
        <canvas
          ref={waterfallRef}
          className="w-full"
          style={{ height: waterfallHeight }}
        />
      )}

      {/* Mode indicator */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-xs font-mono">
        {mode.toUpperCase()}
      </div>

      {/* Zoom indicator */}
      {zoomLevel !== 1 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs font-mono">
          {zoomLevel.toFixed(1)}x
        </div>
      )}
    </div>
  );
}
