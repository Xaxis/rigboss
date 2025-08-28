import React, { useRef, useEffect, useState } from 'react';
import { useSpectrumFrame, useSpectrumSettings, useSpectrumMode } from '@/stores/spectrum';
import { dbToColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement>(null);
  const frame = useSpectrumFrame();
  const settings = useSpectrumSettings();
  const mode = useSpectrumMode();
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);

  // Waterfall history for waterfall display
  const waterfallHistory = useRef<number[][]>([]);
  const maxWaterfallLines = 200;

  useEffect(() => {
    if (!frame || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw spectrum based on mode
    if (mode === 'spectrum' || mode === 'combined') {
      drawSpectrum(ctx, frame, settings, width, height, mode === 'combined' ? height / 2 : height);
    }

    if (mode === 'waterfall' || mode === 'combined') {
      drawWaterfall(ctx, frame, settings, width, height, mode === 'combined');
    }

    // Draw frequency grid and labels
    drawFrequencyGrid(ctx, settings, width, height);

    // Draw mouse cursor info
    if (mousePos) {
      drawCursorInfo(ctx, mousePos, settings, width, height);
    }

  }, [frame, settings, mode, mousePos, zoomLevel, panOffset]);

  const drawSpectrum = (
    ctx: CanvasRenderingContext2D,
    frame: any,
    settings: any,
    width: number,
    height: number,
    spectrumHeight: number
  ) => {
    if (!frame.db || frame.db.length === 0) return;

    const data = frame.db;
    const binWidth = width / data.length;
    const maxDb = settings.refLevel;
    const minDb = maxDb - 80; // 80dB dynamic range

    // Draw spectrum line
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = i * binWidth;
      const normalizedDb = Math.max(0, Math.min(1, (data[i] - minDb) / (maxDb - minDb)));
      const y = spectrumHeight - (normalizedDb * spectrumHeight);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Fill under the curve
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.lineTo(width, spectrumHeight);
    ctx.lineTo(0, spectrumHeight);
    ctx.closePath();
    ctx.fill();
  };

  const drawWaterfall = (
    ctx: CanvasRenderingContext2D,
    frame: any,
    settings: any,
    width: number,
    height: number,
    isCombined: boolean
  ) => {
    if (!frame.db || frame.db.length === 0) return;

    // Add current frame to waterfall history
    waterfallHistory.current.push([...frame.db]);
    if (waterfallHistory.current.length > maxWaterfallLines) {
      waterfallHistory.current.shift();
    }

    const waterfallTop = isCombined ? height / 2 : 0;
    const waterfallHeight = isCombined ? height / 2 : height;
    const lineHeight = waterfallHeight / waterfallHistory.current.length;

    const maxDb = settings.refLevel;
    const minDb = maxDb - 80;

    // Draw waterfall lines
    waterfallHistory.current.forEach((line, lineIndex) => {
      const y = waterfallTop + lineIndex * lineHeight;
      
      for (let i = 0; i < line.length; i++) {
        const x = (i / line.length) * width;
        const normalizedDb = Math.max(0, Math.min(1, (line[i] - minDb) / (maxDb - minDb)));
        const color = dbToColor(line[i], settings.colorMap);
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width / line.length, lineHeight);
      }
    });
  };

  const drawFrequencyGrid = (
    ctx: CanvasRenderingContext2D,
    settings: any,
    width: number,
    height: number
  ) => {
    const startHz = settings.centerHz - settings.spanHz / 2;
    const endHz = settings.centerHz + settings.spanHz / 2;
    const hzPerPixel = settings.spanHz / width;

    // Draw vertical grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    const gridSpacing = settings.spanHz / 10; // 10 divisions
    for (let i = 0; i <= 10; i++) {
      const hz = startHz + i * gridSpacing;
      const x = (hz - startHz) / hzPerPixel;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Frequency labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      const freqLabel = (hz / 1000000).toFixed(3) + ' MHz';
      ctx.fillText(freqLabel, x, height - 5);
    }

    // Draw horizontal grid lines (dB scale)
    const dbRange = 80;
    const dbPerPixel = dbRange / height;
    
    for (let db = -80; db <= 0; db += 10) {
      const y = height - ((db + 80) / dbRange) * height;
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // dB labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${db} dB`, 5, y - 2);
    }
  };

  const drawCursorInfo = (
    ctx: CanvasRenderingContext2D,
    mousePos: { x: number; y: number },
    settings: any,
    width: number,
    height: number
  ) => {
    const startHz = settings.centerHz - settings.spanHz / 2;
    const hzPerPixel = settings.spanHz / width;
    const frequency = startHz + mousePos.x * hzPerPixel;
    
    // Draw crosshair
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(mousePos.x, 0);
    ctx.lineTo(mousePos.x, height);
    ctx.moveTo(0, mousePos.y);
    ctx.lineTo(width, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw frequency info box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(mousePos.x + 10, mousePos.y - 30, 120, 25);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${(frequency / 1000000).toFixed(3)} MHz`, mousePos.x + 15, mousePos.y - 10);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
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

  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
      
      {/* Mode indicator */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-white text-xs font-mono">
        {mode.toUpperCase()}
      </div>
      
      {/* Zoom indicator */}
      {zoomLevel !== 1 && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 rounded text-white text-xs font-mono">
          {zoomLevel.toFixed(1)}x
        </div>
      )}
    </div>
  );
}
