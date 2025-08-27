import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';

interface MiniSpectrumProps {
  height?: number;
}

const MiniSpectrum: React.FC<MiniSpectrumProps> = ({ height = 120 }) => {
  const { radioState, radioConnected } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(false);

  // Generate simplified spectrum data for mini display
  const generateMiniSpectrumData = (width: number): number[] => {
    const bins = Math.floor(width / 3); // Lower resolution for mini display
    const data = new Array(bins);
    const currentFreq = radioState.frequency || 14200000;
    const span = 50000; // Fixed 50kHz span for mini display
    const centerFreq = currentFreq;
    
    for (let i = 0; i < bins; i++) {
      const freq = centerFreq - span/2 + (i / bins) * span;
      const freqDiff = Math.abs(freq - currentFreq);
      
      // Base noise floor
      let amplitude = -110 + Math.random() * 8;
      
      // Add signal at current frequency
      if (freqDiff < 2000) {
        amplitude = Math.max(amplitude, -45 + Math.random() * 10);
      }
      
      // Add some random activity
      if (Math.random() < 0.02) {
        amplitude = Math.max(amplitude, -80 + Math.random() * 30);
      }
      
      data[i] = Math.max(-120, Math.min(-20, amplitude));
    }
    
    return data;
  };

  const drawMiniSpectrum = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    const data = generateMiniSpectrumData(width);
    
    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);
    
    // Draw spectrum fill
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const amplitude = data[i];
      const y = height - ((amplitude + 120) / 100) * height;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    
    // Draw spectrum line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * width;
      const amplitude = data[i];
      const y = height - ((amplitude + 120) / 100) * height;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Draw center frequency marker
    const centerX = width / 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw frequency labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    if (radioState.frequency) {
      const freq = radioState.frequency / 1000000;
      ctx.fillText(`${freq.toFixed(3)} MHz`, width / 2, height - 5);
    }
    
    // Draw signal strength indicator
    const maxSignal = Math.max(...data);
    ctx.fillStyle = maxSignal > -60 ? '#ef4444' : maxSignal > -80 ? '#f59e0b' : '#10b981';
    ctx.fillRect(width - 20, 5, 15, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S', width - 12.5, 12);
  };

  const animate = () => {
    if (!isRunning || !radioConnected) return;
    
    drawMiniSpectrum();
    animationRef.current = requestAnimationFrame(animate);
  };

  // Start/stop based on radio connection
  useEffect(() => {
    if (radioConnected) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [radioConnected]);

  // Animation loop
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

  // Update canvas size when container resizes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas);
    
    // Initial size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = height;

    return () => resizeObserver.disconnect();
  }, [height]);

  if (!radioConnected) {
    return (
      <div 
        className="bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600"
        style={{ height }}
      >
        <div className="text-center text-slate-400">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <div className="text-xs">No Signal</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-600">
      <div className="px-3 py-2 bg-slate-700 border-b border-slate-600">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Mini Spectrum</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs text-slate-400">±25kHz</span>
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height }}
      />
    </div>
  );
};

export default MiniSpectrum;
