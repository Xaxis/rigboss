import React, { useRef, useEffect, useCallback } from 'react';
import type { SpectrumFrame, SpectrumSettings, SpectrumMode } from '@/types';

interface SpectrumCanvasProps {
  frame: SpectrumFrame | null;
  settings: SpectrumSettings;
  mode: SpectrumMode;
  width: number;
  height: number;
  variant: 'full' | 'mini' | 'embedded' | 'fullscreen';
}



export function SpectrumCanvas({
  frame,
  settings,
  mode,
  width,
  height,
  variant
}: SpectrumCanvasProps) {
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallCanvasRef = useRef<HTMLCanvasElement>(null);
  const traceHistoryRef = useRef<number[][]>([]);

  // Color palettes
  const colorPalettes = {
    viridis: (intensity: number) => {
      const r = Math.floor(68 + 187 * intensity);
      const g = Math.floor(1 + 254 * intensity);
      const b = Math.floor(84 + 171 * intensity);
      return `rgb(${r},${g},${b})`;
    },
    inferno: (intensity: number) => {
      const r = Math.floor(0 + 255 * intensity);
      const g = Math.floor(0 + 255 * Math.max(0, intensity - 0.25) * 1.33);
      const b = Math.floor(0 + 255 * Math.max(0, intensity - 0.5) * 2);
      return `rgb(${r},${g},${b})`;
    },
    plasma: (intensity: number) => {
      const r = Math.floor(13 + 242 * intensity);
      const g = Math.floor(8 + 247 * Math.sin(intensity * Math.PI));
      const b = Math.floor(135 + 120 * intensity);
      return `rgb(${r},${g},${b})`;
    },
    turbo: (intensity: number) => {
      const r = Math.floor(48 + 207 * intensity);
      const g = Math.floor(18 + 237 * Math.sin(intensity * Math.PI * 0.8));
      const b = Math.floor(59 + 196 * (1 - intensity));
      return `rgb(${r},${g},${b})`;
    }
  };

  const getWaterfallColor = useCallback((dbValue: number) => {
    const palette = colorPalettes[settings.colorMap as keyof typeof colorPalettes] || colorPalettes.viridis;
    const minDb = settings.refLevel - 80;
    const maxDb = settings.refLevel;
    const intensity = Math.max(0, Math.min(1, (dbValue - minDb) / (maxDb - minDb)));
    return palette(intensity * settings.waterfallIntensity);
  }, [settings.colorMap, settings.refLevel, settings.waterfallIntensity]);

  // Process trace based on mode
  const processTrace = useCallback((bins: number[]) => {
    switch (settings.traceMode) {
      case 'max_hold':
        if (traceHistoryRef.current.length === 0) {
          traceHistoryRef.current = [bins];
        } else {
          const maxTrace = traceHistoryRef.current[0];
          for (let i = 0; i < bins.length; i++) {
            maxTrace[i] = Math.max(maxTrace[i] || -Infinity, bins[i]);
          }
        }
        return traceHistoryRef.current[0];
      
      case 'average':
        traceHistoryRef.current.push(bins);
        if (traceHistoryRef.current.length > settings.averaging) {
          traceHistoryRef.current.shift();
        }
        const avgTrace = new Array(bins.length).fill(0);
        for (const trace of traceHistoryRef.current) {
          for (let i = 0; i < bins.length; i++) {
            avgTrace[i] += trace[i] / traceHistoryRef.current.length;
          }
        }
        return avgTrace;
      
      case 'peak_hold':
        traceHistoryRef.current.push(bins);
        if (traceHistoryRef.current.length > 50) { // Hold for 50 frames
          traceHistoryRef.current.shift();
        }
        const peakTrace = new Array(bins.length).fill(-Infinity);
        for (const trace of traceHistoryRef.current) {
          for (let i = 0; i < bins.length; i++) {
            peakTrace[i] = Math.max(peakTrace[i], trace[i]);
          }
        }
        return peakTrace;
      
      default: // 'live'
        return bins;
    }
  }, [settings.traceMode, settings.averaging]);

  // UNIFIED FREQUENCY MAPPING FUNCTION
  const getFrequencyMapping = useCallback((frame: SpectrumFrame) => {
    // Data frequency range (what the backend provides)
    const dataStartHz = frame.startHz;
    const dataEndHz = dataStartHz + frame.binSizeHz * frame.bins.length;

    // Display frequency range (what user wants to see)
    const displayStartHz = settings.centerHz - settings.spanHz / 2;
    const displayEndHz = settings.centerHz + settings.spanHz / 2;

    // Calculate overlap between data and display ranges
    const overlapStartHz = Math.max(dataStartHz, displayStartHz);
    const overlapEndHz = Math.min(dataEndHz, displayEndHz);
    const hasOverlap = overlapStartHz < overlapEndHz;

    return {
      dataStartHz,
      dataEndHz,
      displayStartHz,
      displayEndHz,
      overlapStartHz,
      overlapEndHz,
      hasOverlap,
      binSizeHz: frame.binSizeHz
    };
  }, [settings.centerHz, settings.spanHz]);

  // Render spectrum
  const renderSpectrum = useCallback((
    ctx: CanvasRenderingContext2D,
    frame: SpectrumFrame,
    width: number,
    height: number
  ) => {
    if (!frame.bins || frame.bins.length === 0) return;

    const processedBins = processTrace(frame.bins);
    const minDb = settings.refLevel - 80;
    const maxDb = settings.refLevel;
    const dbRange = maxDb - minDb;
    const freqMap = getFrequencyMapping(frame);

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw grid if enabled
    if (settings.showGrid && variant !== 'mini') {
      drawGrid(ctx, frame, width, height, minDb, maxDb);
    }

    // Draw spectrum trace - SIMPLE: STRETCH DATA ACROSS FULL WIDTH
    ctx.strokeStyle = settings.spectrumColor;
    ctx.lineWidth = variant === 'mini' ? 1 : 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Draw spectrum trace - PROPER SPAN/CENTER CONTROL
    ctx.strokeStyle = settings.spectrumColor;
    ctx.lineWidth = variant === 'mini' ? 1 : 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Calculate what portion of the data to display based on span/center
    const dataStartHz = frame.startHz;
    const dataEndHz = frame.startHz + frame.binSizeHz * frame.bins.length;
    const dataCenterHz = (dataStartHz + dataEndHz) / 2;
    const dataSpanHz = dataEndHz - dataStartHz;

    // User's display settings
    const displayStartHz = settings.centerHz - settings.spanHz / 2;
    const displayEndHz = settings.centerHz + settings.spanHz / 2;

    console.log('RENDER DEBUG:', {
      dataRange: `${dataStartHz} - ${dataEndHz} (${dataSpanHz} Hz)`,
      displayRange: `${displayStartHz} - ${displayEndHz} (${settings.spanHz} Hz)`,
      center: settings.centerHz
    });

    let hasStarted = false;

    // Draw only the portion of data that falls within display range
    for (let i = 0; i < processedBins.length; i++) {
      const binHz = dataStartHz + i * frame.binSizeHz;

      // Only draw if this bin is within the display span
      if (binHz >= displayStartHz && binHz <= displayEndHz) {
        // Map frequency to pixel position within display span
        const x = ((binHz - displayStartHz) / settings.spanHz) * width;
        const dbValue = processedBins[i];
        const normalizedDb = Math.max(0, Math.min(1, (dbValue - minDb) / dbRange));
        const y = Math.max(0, Math.min(height, height - (normalizedDb * height)));

        if (!hasStarted) {
          ctx.moveTo(x, y);
          hasStarted = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Fill under curve for better visibility
    if (variant !== 'mini') {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, settings.spectrumColor + '40');
      gradient.addColorStop(1, settings.spectrumColor + '10');
      ctx.fillStyle = gradient;
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    }
  }, [settings, variant, processTrace, getFrequencyMapping]);

  // Render waterfall
  const renderWaterfall = useCallback((
    ctx: CanvasRenderingContext2D,
    frame: SpectrumFrame,
    width: number,
    height: number
  ) => {
    if (!frame.bins || frame.bins.length === 0) return;

    // Get actual canvas dimensions (accounting for device pixel ratio)
    const actualWidth = ctx.canvas.width;
    const actualHeight = ctx.canvas.height;

    // Scroll existing content down by 1 pixel
    if (actualHeight > 1) {
      const imageData = ctx.getImageData(0, 0, actualWidth, actualHeight - 1);
      ctx.putImageData(imageData, 0, 1);
    }

    // Draw new line at top - PROPER SPAN/CENTER CONTROL
    const imageData = ctx.createImageData(actualWidth, 1);
    const data = imageData.data;

    // Calculate frequency mapping (same as spectrum)
    const dataStartHz = frame.startHz;
    const displayStartHz = settings.centerHz - settings.spanHz / 2;
    const displayEndHz = settings.centerHz + settings.spanHz / 2;

    for (let x = 0; x < actualWidth; x++) {
      // Calculate what frequency this pixel represents
      const pixelHz = displayStartHz + (x / actualWidth) * settings.spanHz;

      // Find corresponding bin in the data
      const binIndex = Math.round((pixelHz - dataStartHz) / frame.binSizeHz);

      // Get dB value if within data range, otherwise use noise floor
      let dbValue: number;
      if (binIndex >= 0 && binIndex < frame.bins.length) {
        dbValue = frame.bins[binIndex];
      } else {
        dbValue = settings.refLevel - 80; // Noise floor
      }

      const color = getWaterfallColor(dbValue);

      const rgb = color.match(/\d+/g);
      if (rgb) {
        const idx = x * 4;
        data[idx] = parseInt(rgb[0]);     // R
        data[idx + 1] = parseInt(rgb[1]); // G
        data[idx + 2] = parseInt(rgb[2]); // B
        data[idx + 3] = 255;              // A
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [getWaterfallColor, settings.refLevel, settings.centerHz, settings.spanHz, getFrequencyMapping]);

  // Draw grid
  const drawGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    frame: SpectrumFrame,
    width: number,
    height: number,
    minDb: number,
    maxDb: number
  ) => {
    const startHz = frame.startHz;
    const endHz = startHz + frame.binSizeHz * frame.bins.length;
    const spanHz = endHz - startHz;

    ctx.strokeStyle = settings.gridColor;
    ctx.lineWidth = 0.5;
    ctx.font = '10px monospace';
    ctx.fillStyle = settings.gridColor;

    // Vertical frequency grid
    const freqDivisions = variant === 'mini' ? 5 : 10;
    for (let i = 0; i <= freqDivisions; i++) {
      const freq = startHz + (i / freqDivisions) * spanHz;
      const x = (i / freqDivisions) * width;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (variant !== 'mini') {
        const freqMHz = freq / 1000000;
        ctx.textAlign = 'center';
        ctx.fillText(`${freqMHz.toFixed(3)}`, x, height - 5);
      }
    }

    // Horizontal dB grid
    const dbDivisions = variant === 'mini' ? 4 : 8;
    for (let i = 0; i <= dbDivisions; i++) {
      const db = minDb + (i / dbDivisions) * (maxDb - minDb);
      const y = height - (i / dbDivisions) * height;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      if (variant !== 'mini') {
        ctx.textAlign = 'left';
        ctx.fillText(`${db.toFixed(0)}`, 5, y - 2);
      }
    }
  }, [settings.gridColor, variant]);

  // Spectrum canvas size effect
  useEffect(() => {
    if (!spectrumCanvasRef.current || width === 0 || height === 0) return;
    if (mode === 'waterfall') return;

    const canvas = spectrumCanvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const displayHeight = mode === 'combined' ? height / 2 : height;

    const targetWidth = width * dpr;
    const targetHeight = displayHeight * dpr;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }, [width, height, mode]);

  // Spectrum rendering effect
  useEffect(() => {
    if (!frame || !spectrumCanvasRef.current || width === 0 || height === 0) return;
    if (mode === 'waterfall') return;

    const canvas = spectrumCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayHeight = mode === 'combined' ? height / 2 : height;
    renderSpectrum(ctx, frame, width, displayHeight);
  }, [frame, settings.showGrid, settings.gridColor, settings.spectrumColor, settings.traceMode, settings.refLevel, settings.centerHz, settings.spanHz, getFrequencyMapping]);

  // Waterfall canvas effect
  useEffect(() => {
    if (!frame || !waterfallCanvasRef.current || width === 0 || height === 0) return;
    if (mode === 'spectrum') return;

    const canvas = waterfallCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const displayHeight = mode === 'combined' ? height / 2 : height;

    // Only resize canvas if dimensions changed
    const targetWidth = width * dpr;
    const targetHeight = displayHeight * dpr;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${displayHeight}px`;

      // Reset transform and apply scaling
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Clear canvas when resizing
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, displayHeight);
    }

    renderWaterfall(ctx, frame, width, displayHeight);
  }, [frame, settings, mode, width, height, renderWaterfall]);

  // Clear trace history when trace mode changes
  useEffect(() => {
    traceHistoryRef.current = [];
  }, [settings.traceMode]);

  const spectrumHeight = mode === 'combined' ? '50%' : '100%';
  const waterfallHeight = mode === 'combined' ? '50%' : '100%';

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Spectrum Canvas */}
      {(mode === 'spectrum' || mode === 'combined') && (
        <canvas
          ref={spectrumCanvasRef}
          className="block"
          style={{ height: spectrumHeight }}
        />
      )}

      {/* Waterfall Canvas */}
      {(mode === 'waterfall' || mode === 'combined') && (
        <canvas
          ref={waterfallCanvasRef}
          className="block"
          style={{ height: waterfallHeight }}
        />
      )}
    </div>
  );
}
