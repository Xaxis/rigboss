import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { amateurBands, getBandForFrequency } from '@/data/bands';
import Button from './ui/Button';
import LiveIndicator from './ui/LiveIndicator';

interface SpectrumDisplayProps {
  className?: string;
}

const SpectrumDisplay: React.FC<SpectrumDisplayProps> = ({
  className = ''
}) => {
  const {
    radioState,
    radioConnected,
    config,
    updateConfig,
    addToast,
    addActivityLog,
  } = useAppStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const resizeObserverRef = useRef<ResizeObserver>();

  const [isRunning, setIsRunning] = useState(false);
  const [centerFreq, setCenterFreq] = useState(radioState.frequency || 14200000);
  const [span, setSpan] = useState(100000); // 100 kHz span
  const [waterfallData, setWaterfallData] = useState<number[][]>([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });
  const [avgNoise, setAvgNoise] = useState(-120);
  const [peakHold, setPeakHold] = useState(true);
  const [peakData, setPeakData] = useState<number[]>([]);
  const [waterfallSpeed, setWaterfallSpeed] = useState(5);
  const [showGrid, setShowGrid] = useState(true);
  const [colorScheme, setColorScheme] = useState<'classic' | 'modern' | 'thermal'>('modern');
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [showBandEdges, setShowBandEdges] = useState(true);
  // Refs that mirror dynamic controls to avoid stale closures in the animation loop
  const centerFreqRef = useRef(centerFreq);
  const spanRef = useRef(span);
  const showGridRef = useRef(showGrid);
  const peakHoldRef = useRef(peakHold);
  const showBandEdgesRef = useRef(showBandEdges);
  const colorSchemeRef = useRef(colorScheme);
  const waterfallSpeedRef = useRef(waterfallSpeed);
  const radioFreqRef = useRef<number | null>(radioState.frequency ?? null);

  // Keep refs in sync with state without restarting animation
  useEffect(() => { centerFreqRef.current = centerFreq; }, [centerFreq]);
  useEffect(() => { spanRef.current = span; }, [span]);
  useEffect(() => { showGridRef.current = showGrid; }, [showGrid]);
  useEffect(() => { peakHoldRef.current = peakHold; }, [peakHold]);
  useEffect(() => { showBandEdgesRef.current = showBandEdges; }, [showBandEdges]);
  useEffect(() => { colorSchemeRef.current = colorScheme; }, [colorScheme]);
  useEffect(() => { waterfallSpeedRef.current = waterfallSpeed; }, [waterfallSpeed]);
  useEffect(() => { radioFreqRef.current = radioState.frequency ?? null; }, [radioState.frequency]);


  // Enhanced spectrum data generation with more realistic signals
  const generateSpectrumData = (): number[] => {
    const bins = Math.floor(dimensions.width / 2); // Higher resolution based on width
    const data = new Array(bins);
    const currentFreq = (radioFreqRef.current ?? centerFreqRef.current);

    // Calculate average noise floor
    let noiseSum = 0;

    for (let i = 0; i < bins; i++) {
      const freq = centerFreqRef.current - spanRef.current/2 + (i / bins) * spanRef.current;
      const freqDiff = Math.abs(freq - currentFreq);

      // Base noise floor with realistic variation
      let amplitude = avgNoise + Math.random() * 8 - 4;

      // Add current radio signal
      if (freqDiff < 3000) {
        const signalStrength = -35 + Math.random() * 10;
        amplitude = Math.max(amplitude, signalStrength);
      }

      // Add realistic band activity
      if (freq >= 14000000 && freq <= 14350000) {
        // 20m band - add some CW and SSB signals
        if (Math.random() < 0.008) {
          amplitude = Math.max(amplitude, -70 + Math.random() * 30);
        }
        amplitude += 5; // Band noise
      } else if (freq >= 7000000 && freq <= 7300000) {
        // 40m band - more active at night
        if (Math.random() < 0.012) {
          amplitude = Math.max(amplitude, -65 + Math.random() * 25);
        }
        amplitude += 8;
      } else if (freq >= 3500000 && freq <= 4000000) {
        // 80m band - very active
        if (Math.random() < 0.015) {
          amplitude = Math.max(amplitude, -60 + Math.random() * 20);
        }
        amplitude += 12;
      }

      // Add some spurious signals
      if (Math.random() < 0.003) {
        amplitude = Math.max(amplitude, -80 + Math.random() * 40);
      }

      data[i] = Math.max(-140, Math.min(-10, amplitude));
      noiseSum += amplitude;
    }

    // Update average noise floor
    setAvgNoise(noiseSum / bins);

    // Update peak hold data
    if (peakHold) {
      setPeakData(prev => {
        const newPeakData = [...prev];
        if (newPeakData.length !== bins) {
          return [...data]; // Initialize if size changed
        }
        for (let i = 0; i < bins; i++) {
          newPeakData[i] = Math.max(newPeakData[i] - 0.5, data[i]); // Slow decay
        }
        return newPeakData;
      });
    }

    return data;
  };

  const drawSpectrum = (data: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    // Clear canvas with dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw plot area background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

    // Draw grid if enabled
    if (showGridRef.current) {
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;

      // Vertical grid lines (frequency)
      for (let i = 0; i <= 10; i++) {
        const x = margin.left + (i / 10) * plotWidth;
        ctx.beginPath();
        ctx.moveTo(x, margin.top);
        ctx.lineTo(x, margin.top + plotHeight);
        ctx.stroke();
      }

      // Horizontal grid lines (amplitude)
      for (let i = 0; i <= 8; i++) {
        const y = margin.top + (i / 8) * plotHeight;
        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + plotWidth, y);
        ctx.stroke();
      }
    }

    // Draw spectrum fill area
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + plotHeight);

    for (let i = 0; i < data.length; i++) {
      const x = margin.left + (i / (data.length - 1)) * plotWidth;
      const amplitude = data[i];
      const y = margin.top + plotHeight - ((amplitude + 140) / 120) * plotHeight;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
    ctx.closePath();
    ctx.fill();

    // Draw spectrum line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = margin.left + (i / (data.length - 1)) * plotWidth;
      const amplitude = data[i];
      const y = margin.top + plotHeight - ((amplitude + 140) / 120) * plotHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw peak hold if enabled
    if (peakHoldRef.current && peakData.length === data.length) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < peakData.length; i++) {
        const x = margin.left + (i / (peakData.length - 1)) * plotWidth;
        const amplitude = peakData[i];
        const y = margin.top + plotHeight - ((amplitude + 140) / 120) * plotHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // Draw band edges if enabled
    if (showBandEdgesRef.current) {
      const visibleBands = amateurBands.filter(band => {
        const bandStart = band.start;
        const bandEnd = band.end;
        const spanStart = centerFreqRef.current - spanRef.current/2;
        const spanEnd = centerFreqRef.current + spanRef.current/2;

        return (bandStart <= spanEnd && bandEnd >= spanStart);
      });

    visibleBands.forEach(band => {
      // Draw band start edge
      const startOffset = band.start - (centerFreqRef.current - spanRef.current/2);
      const startX = margin.left + (startOffset / span) * plotWidth;

      if (startX >= margin.left && startX <= margin.left + plotWidth) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(startX, margin.top);
        ctx.lineTo(startX, margin.top + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw band end edge
      const endOffset = band.end - (centerFreqRef.current - spanRef.current/2);
      const endX = margin.left + (endOffset / span) * plotWidth;

      if (endX >= margin.left && endX <= margin.left + plotWidth) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(endX, margin.top);
        ctx.lineTo(endX, margin.top + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw band label
      const bandCenter = (band.start + band.end) / 2;
      const bandCenterOffset = bandCenter - (centerFreqRef.current - spanRef.current/2);
      const bandCenterX = margin.left + (bandCenterOffset / span) * plotWidth;

      if (bandCenterX >= margin.left && bandCenterX <= margin.left + plotWidth) {
        ctx.fillStyle = '#8b5cf6';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(band.name, bandCenterX, margin.top + 15);
      }
    });
    }

    // Draw frequency marker for current radio frequency
    if (radioFreqRef.current) {
      const freqOffset = (radioFreqRef.current as number) - (centerFreqRef.current - spanRef.current/2);
      const markerX = margin.left + (freqOffset / span) * plotWidth;

      if (markerX >= margin.left && markerX <= margin.left + plotWidth) {
        // Marker line
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(markerX, margin.top);
        ctx.lineTo(markerX, margin.top + plotHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Frequency label with background
        const label = `${(radioState.frequency / 1000000).toFixed(3)} MHz`;
        ctx.font = '12px Inter, sans-serif';
        const labelWidth = ctx.measureText(label).width;

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(markerX + 5, margin.top + 25, labelWidth + 8, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, markerX + 9, margin.top + 38);
      }
    }

    // Draw frequency labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const freq = centerFreqRef.current - spanRef.current/2 + (i / 10) * spanRef.current;
      const x = margin.left + (i / 10) * plotWidth;
      ctx.fillText(
        `${(freq / 1000000).toFixed(2)}`,
        x,
        height - 10
      );
    }

    // Draw amplitude labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 8; i++) {
      const amplitude = -140 + (i / 8) * 120;
      const y = margin.top + plotHeight - (i / 8) * plotHeight;
      ctx.fillText(
        `${amplitude.toFixed(0)} dBm`,
        margin.left - 10,
        y + 4
      );
    }

    // Draw axis labels
    ctx.textAlign = 'center';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Frequency (MHz)', width / 2, height - 5);

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Signal Strength (dBm)', 0, 0);
    ctx.restore();

    // Reset text alignment
    ctx.textAlign = 'left';
  };

  const getColorForIntensity = (intensity: number): [number, number, number] => {
    // Normalize intensity to 0-1
    const norm = Math.max(0, Math.min(1, intensity));

    switch (colorSchemeRef.current) {
      case 'classic':
        // Blue to green to yellow to red
        if (norm < 0.25) {
          return [0, 0, Math.floor(norm * 4 * 255)];
        } else if (norm < 0.5) {
          return [0, Math.floor((norm - 0.25) * 4 * 255), 255];
        } else if (norm < 0.75) {
          return [Math.floor((norm - 0.5) * 4 * 255), 255, 255 - Math.floor((norm - 0.5) * 4 * 255)];
        } else {
          return [255, 255 - Math.floor((norm - 0.75) * 4 * 255), 0];
        }

      case 'thermal':
        // Black to red to yellow to white
        if (norm < 0.33) {
          return [Math.floor(norm * 3 * 255), 0, 0];
        } else if (norm < 0.66) {
          return [255, Math.floor((norm - 0.33) * 3 * 255), 0];
        } else {
          const white = Math.floor((norm - 0.66) * 3 * 255);
          return [255, 255, white];
        }

      case 'modern':
      default:
        // Dark blue to cyan to green to yellow to red
        if (norm < 0.2) {
          return [0, 0, Math.floor(64 + norm * 5 * 191)];
        } else if (norm < 0.4) {
          return [0, Math.floor((norm - 0.2) * 5 * 255), 255];
        } else if (norm < 0.6) {
          return [0, 255, 255 - Math.floor((norm - 0.4) * 5 * 255)];
        } else if (norm < 0.8) {
          return [Math.floor((norm - 0.6) * 5 * 255), 255, 0];
        } else {
          return [255, 255 - Math.floor((norm - 0.8) * 5 * 255), 0];
        }
    }
  };

  const drawWaterfall = (data: number[]) => {
    const canvas = waterfallRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const margin = { left: 60, right: 60 };
    const plotWidth = width - margin.left - margin.right;

    // Shift existing data down by waterfallSpeed pixels
    const shiftAmount = Math.max(1, Math.floor(waterfallSpeedRef.current / 2));
    if (height > shiftAmount) {
      const imageData = ctx.getImageData(margin.left, 0, plotWidth, height - shiftAmount);
      ctx.putImageData(imageData, margin.left, shiftAmount);
    }

    // Clear the top area
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, shiftAmount);
    ctx.fillRect(0, 0, margin.left, height);
    ctx.fillRect(width - margin.right, 0, margin.right, height);

    // Draw new lines at top
    for (let line = 0; line < shiftAmount; line++) {
      const newLine = ctx.createImageData(plotWidth, 1);

      for (let i = 0; i < plotWidth; i++) {
        const dataIndex = Math.floor((i / plotWidth) * data.length);
        const amplitude = data[dataIndex] || avgNoise;
        const intensity = (amplitude + 140) / 120; // Map -140 to -20 dBm to 0-1

        const [r, g, b] = getColorForIntensity(intensity);
        const pixelIndex = i * 4;

        newLine.data[pixelIndex] = r;     // R
        newLine.data[pixelIndex + 1] = g; // G
        newLine.data[pixelIndex + 2] = b; // B
        newLine.data[pixelIndex + 3] = 255; // A
      }

      ctx.putImageData(newLine, margin.left, line);
    }

    // Draw frequency marker on waterfall
    if (radioFreqRef.current) {
      const freqOffset = (radioFreqRef.current as number) - (centerFreqRef.current - spanRef.current/2);
      const markerX = margin.left + (freqOffset / span) * plotWidth;

      if (markerX >= margin.left && markerX <= margin.left + plotWidth) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(markerX, 0);
        ctx.lineTo(markerX, height);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw frequency scale on waterfall
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const freq = centerFreqRef.current - spanRef.current/2 + (i / 10) * spanRef.current;
      const x = margin.left + (i / 10) * plotWidth;
      ctx.fillText(
        `${(freq / 1000000).toFixed(2)}`,
        x,
        height - 5
      );
    }

    // Draw time markers on the side
    ctx.textAlign = 'right';
    ctx.font = '9px Inter, sans-serif';
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const y = (i / 4) * height;
      const timeAgo = i * 10; // seconds ago
      const time = new Date(now.getTime() - timeAgo * 1000);
      ctx.fillText(
        time.toLocaleTimeString().slice(-8, -3),
        margin.left - 5,
        y + 4
      );
    }

    ctx.textAlign = 'left';
  };

  const animate = () => {
    if (!isRunning) return;

    const data = generateSpectrumData();
    drawSpectrum(data);
    drawWaterfall(data);

    // Update waterfall data for history
    setWaterfallData(prev => {
      const newData = [...prev, data];
      return newData.slice(-200); // Keep last 200 lines
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  const startSpectrum = () => {
    if (!radioConnected) {
      addToast({
        type: 'warning',
        title: 'Radio Not Connected',
        message: 'Connect to radio first to view spectrum',
      });
      return;
    }

    setIsRunning(true);
    addToast({
      type: 'success',
      title: 'Spectrum Started',
      message: 'Real-time spectrum display active',
      duration: 2000,
    });
  };

  const stopSpectrum = () => {
    setIsRunning(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    addToast({
      type: 'info',
      title: 'Spectrum Stopped',
      message: 'Spectrum display paused',
      duration: 2000,
    });
  };

  // Responsive sizing - STABLE implementation
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(400, rect.width - 32); // Account for padding
        const newHeight = Math.max(200, Math.min(400, newWidth * 0.4)); // Maintain aspect ratio

        // Only update if dimensions actually changed significantly
        setDimensions(prev => {
          if (Math.abs(prev.width - newWidth) > 5 || Math.abs(prev.height - newHeight) > 5) {
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });
      }
    };

    // Initial sizing
    updateDimensions();

    // Set up ResizeObserver for responsive updates
    if (containerRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        // Debounce resize updates
        setTimeout(updateDimensions, 100);
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Update canvas dimensions when dimensions change - SAFE implementation
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current && waterfallRef.current) {
        // Store current canvas state before resize
        const spectrumCanvas = canvasRef.current;
        const waterfallCanvas = waterfallRef.current;

        // Only update if canvas size is actually different
        if (spectrumCanvas.width !== dimensions.width || spectrumCanvas.height !== dimensions.height) {
          spectrumCanvas.width = dimensions.width;
          spectrumCanvas.height = dimensions.height;
          waterfallCanvas.width = dimensions.width;
          waterfallCanvas.height = dimensions.height;

          // Clear canvases after resize to prevent corruption
          const spectrumCtx = spectrumCanvas.getContext('2d');
          const waterfallCtx = waterfallCanvas.getContext('2d');
          if (spectrumCtx) spectrumCtx.clearRect(0, 0, dimensions.width, dimensions.height);
          if (waterfallCtx) waterfallCtx.clearRect(0, 0, dimensions.width, dimensions.height);
        }
      }
    };

    updateCanvasSize();
  }, [dimensions]);

  // Auto-start when radio connects
  useEffect(() => {
    if (radioConnected) {
      startSpectrum();
    } else {
      stopSpectrum();
    }
  }, [radioConnected]);

  // Update center frequency when radio frequency changes
  useEffect(() => {
    if (radioState.frequency && Math.abs(radioState.frequency - centerFreq) > span / 4) {
      setCenterFreq(radioState.frequency);
    }
  }, [radioState.frequency, centerFreq, span]);

  // Animation loop - ONLY depend on isRunning to prevent restart on control changes
  useEffect(() => {
    if (isRunning) {
      animate();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);

  // Reset peak data when peak hold is disabled
  useEffect(() => {
    if (!peakHold) {
      setPeakData([]);
    }
  }, [peakHold]);

  // Click-to-tune functionality
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const margin = { left: 60, right: 60 };
    const plotWidth = canvas.width - margin.left - margin.right;

    // Calculate clicked frequency
    const relativeX = x - margin.left;
    if (relativeX >= 0 && relativeX <= plotWidth) {
      const freqOffset = (relativeX / plotWidth) * span;
      const clickedFreq = centerFreq - span/2 + freqOffset;

      // Update radio frequency
      if (radioConnected) {
        addToast({
          type: 'info',
          title: 'Tuning Radio',
          message: `Tuning to ${(clickedFreq / 1000000).toFixed(6)} MHz`,
          duration: 2000,
        });

        // This would normally call the radio control function
        // For now, we'll just update the center frequency
        setCenterFreq(clickedFreq);

        addActivityLog({
          type: 'frequency',
          message: `Click-to-tune: ${(clickedFreq / 1000000).toFixed(6)} MHz`,
          success: true,
          details: { frequency: clickedFreq, method: 'click-to-tune' }
        });
      }
    }
  };

  // Mouse tracking for frequency readout
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Calculate frequency and signal strength at mouse position
  const getMouseFrequencyAndSignal = (): { freq: number; signal: number } | null => {
    if (!mousePos || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const margin = { left: 60, right: 60 };
    const plotWidth = canvas.width - margin.left - margin.right;
    const relativeX = mousePos.x - margin.left;

    if (relativeX >= 0 && relativeX <= plotWidth) {
      const freqOffset = (relativeX / plotWidth) * span;
      const freq = centerFreq - span/2 + freqOffset;

      // Estimate signal strength (in real implementation, this would come from actual data)
      const signal = -80 + Math.random() * 40; // Simulated for now

      return { freq, signal };
    }

    return null;
  };

  return (
    <div ref={containerRef} className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Spectrum Analyzer
        </h3>
        <div className="flex items-center space-x-3">
          <LiveIndicator
            active={isRunning}
            label="Live"
            color="green"
            pulse={true}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(dimensions.width)}×{Math.round(dimensions.height)}
          </span>
          {isRunning ? (
            <Button variant="danger" size="sm" onClick={stopSpectrum}>
              Stop
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={startSpectrum}>
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequency Controls */}
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white">Frequency Control</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Center (MHz)
              </label>
              <input
                type="number"
                step="0.001"
                value={(centerFreq / 1000000).toFixed(3)}
                onChange={(e) => setCenterFreq(parseFloat(e.target.value) * 1000000)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Span
              </label>
              <select
                value={span}
                onChange={(e) => setSpan(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={5000}>5 kHz</option>
                <option value={10000}>10 kHz</option>
                <option value={25000}>25 kHz</option>
                <option value={50000}>50 kHz</option>
                <option value={100000}>100 kHz</option>
                <option value={250000}>250 kHz</option>
                <option value={500000}>500 kHz</option>
                <option value={1000000}>1 MHz</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCenterFreq(radioState.frequency || 14200000)}
              className="flex-1"
            >
              Center on Radio
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCenterFreq(prev => prev - span / 2);
              }}
              className="px-3"
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCenterFreq(prev => prev + span / 2);
              }}
              className="px-3"
            >
              →
            </Button>
          </div>
        </div>

        {/* Display Controls */}
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white">Display Options</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color Scheme
              </label>
              <select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="modern">Modern</option>
                <option value="classic">Classic</option>
                <option value="thermal">Thermal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Waterfall Speed
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={waterfallSpeed}
                onChange={(e) => setWaterfallSpeed(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">{waterfallSpeed}</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Grid</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={peakHold}
                onChange={(e) => setPeakHold(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Peak Hold</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showBandEdges}
                onChange={(e) => setShowBandEdges(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Band Edges</span>
            </label>
          </div>
        </div>
      </div>

      {/* Spectrum Display */}
      <div className="bg-slate-900 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Spectrum</h4>
            <div className="text-xs text-slate-400">
              Resolution: {(span / Math.floor(dimensions.width / 2) / 1000).toFixed(1)} kHz/bin
            </div>
          </div>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full block cursor-crosshair"
            style={{ maxWidth: '100%' }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            title="Click to tune radio to frequency"
          />

          {/* Mouse frequency readout */}
          {mousePos && getMouseFrequencyAndSignal() && (
            <div
              className="absolute bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded pointer-events-none z-10"
              style={{
                left: mousePos.x + 10,
                top: mousePos.y - 30,
                transform: mousePos.x > dimensions.width - 150 ? 'translateX(-100%)' : 'none'
              }}
            >
              <div>{(getMouseFrequencyAndSignal()!.freq / 1000000).toFixed(6)} MHz</div>
              <div>{getMouseFrequencyAndSignal()!.signal.toFixed(1)} dBm</div>
            </div>
          )}
        </div>
      </div>

      {/* Waterfall Display */}
      {config.ui.showWaterfall && (
        <div className="bg-slate-900 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Waterfall</h4>
              <div className="text-xs text-slate-400">
                Speed: {waterfallSpeed}/10 • {colorScheme} colors
              </div>
            </div>
          </div>
          <div className="relative">
            <canvas
              ref={waterfallRef}
              width={dimensions.width}
              height={dimensions.height}
              className="w-full block"
              style={{ maxWidth: '100%' }}
            />
          </div>
        </div>
      )}

      {/* Enhanced Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
            {(centerFreq / 1000000).toFixed(3)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Center MHz</div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
            {(span / 1000).toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Span kHz</div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
            {avgNoise.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Noise dBm</div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <div className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
            {isRunning ? '10' : '0'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Update Hz</div>
        </div>
      </div>
    </div>
  );
};

export default SpectrumDisplay;
