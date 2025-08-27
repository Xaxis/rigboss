import React, { useEffect, useRef, useState } from 'react';
import type { SpectrumFrame } from '@/spectrum/SpectrumService';
import { ensureSpectrumConnected, spectrumService } from '@/spectrum';
import { useAppStore } from '@/stores/appStore';

const CombinedSpectrumView: React.FC<{ height?: number }> = ({ height = 300 }) => {
  const { radioState, socketService } = useAppStore();
  const specRef = useRef<HTMLCanvasElement>(null);
  const wfRef = useRef<HTMLCanvasElement>(null);
  const service = spectrumService;
  const [span, setSpan] = useState(100_000);
  const [refLevel, setRefLevel] = useState(-40);
  const [avg, setAvg] = useState(0.5);
  const [peakHold, setPeakHold] = useState(true);
  const [colorMap, setColorMap] = useState<'modern' | 'classic' | 'thermal'>('modern');

  // Peak hold data
  const peakData = useRef<Float32Array | null>(null);

  // Waterfall history
  const waterfallHistory = useRef<ImageData[]>([]);

  // Data flow status
  const [lastFrameTime, setLastFrameTime] = useState<number>(0);
  const [isReceivingData, setIsReceivingData] = useState(false);

  // Connect to spectrum feed
  useEffect(() => {
    ensureSpectrumConnected();
    const off = service.onFrame(draw);
    return () => { off(); };
  }, [service]);

  // Keep center synced to radio
  useEffect(() => {
    if (radioState.frequency) service.setState({ centerHz: radioState.frequency });
  }, [radioState.frequency]);

  // Check for data timeout
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastFrameTime > 0 && Date.now() - lastFrameTime > 3000) {
        setIsReceivingData(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFrameTime]);

  function draw(frame: SpectrumFrame) {
    const now = Date.now();
    setLastFrameTime(now);
    setIsReceivingData(true);

    const spec = specRef.current; const wf = wfRef.current; if (!spec || !wf) return;

    // Get actual container dimensions
    const specHeight = Math.floor(height * 0.6);
    const wfHeight = Math.floor(height * 0.4);

    // Set canvas dimensions to match container exactly
    const w = spec.parentElement?.clientWidth || 800;
    spec.width = w; spec.height = specHeight;
    wf.width = w; wf.height = wfHeight;

    const ctx = spec.getContext('2d')!; const bins = frame.bins; const n = bins.length;
    ctx.clearRect(0,0,spec.width,spec.height);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,spec.width,spec.height);

    // Apply averaging
    if (avg > 0 && peakData.current && peakData.current.length === n) {
      for (let i = 0; i < n; i++) {
        bins[i] = bins[i] * (1 - avg) + peakData.current[i] * avg;
      }
    }

    // Update peak hold
    if (peakHold) {
      if (!peakData.current || peakData.current.length !== n) {
        peakData.current = new Float32Array(bins);
      } else {
        for (let i = 0; i < n; i++) {
          peakData.current[i] = Math.max(peakData.current[i] * 0.999, bins[i]); // slow decay
        }
      }
    }

    // Grid
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5;
    for (let i=0;i<=10;i++){ const x=i*spec.width/10; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,spec.height); ctx.stroke(); }
    for (let i=0;i<=6;i++){ const y=i*spec.height/6; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(spec.width,y); ctx.stroke(); }

    // dB scale labels
    ctx.fillStyle = '#64748b'; ctx.font = '10px monospace';
    for (let i = 0; i <= 6; i++) {
      const y = i * spec.height / 6;
      const db = refLevel - (i / 6) * 120;
      ctx.fillText(`${db.toFixed(0)}`, 2, y + 12);
    }

    // Spectrum line
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i=0;i<n;i++){
      const x = (i/(n-1))*spec.width; const db = bins[i];
      const y = spec.height - ((db - (refLevel - 120)) / 120) * spec.height;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // Peak hold trace
    if (peakHold && peakData.current) {
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i=0;i<n;i++){
        const x = (i/(n-1))*spec.width; const db = peakData.current[i];
        const y = spec.height - ((db - (refLevel - 120)) / 120) * spec.height;
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }

    // Waterfall - scroll down by copying existing data
    const wctx = wf.getContext('2d')!;
    if (wf.height > 1) {
      // Get existing image data and shift it down by 1 pixel
      const imageData = wctx.getImageData(0, 0, wf.width, wf.height - 1);
      wctx.putImageData(imageData, 0, 1);
    }

    // Color mapping function
    const getColor = (t: number) => {
      if (colorMap === 'thermal') {
        const r = Math.floor(255 * Math.min(1, t * 2));
        const g = Math.floor(255 * Math.max(0, Math.min(1, (t - 0.5) * 2)));
        const b = Math.floor(255 * Math.max(0, t - 0.8) * 5);
        return [r, g, b];
      } else if (colorMap === 'classic') {
        const r = Math.floor(255 * t);
        const g = Math.floor(255 * t * 0.7);
        const b = Math.floor(255 * (1 - t));
        return [r, g, b];
      } else { // modern
        const r = Math.floor(255 * t);
        const g = Math.floor(255 * Math.max(0, Math.min(1, (t-0.3)/0.7)));
        const b = Math.floor(255 * (1 - t));
        return [r, g, b];
      }
    };

    // Draw new waterfall line at the top
    const lineData = wctx.createImageData(wf.width, 1);
    for (let x = 0; x < wf.width; x++) {
      const i = Math.floor((x / wf.width) * n);
      const db = bins[i];
      const t = Math.max(0, Math.min(1, (db - (refLevel - 80)) / 80));
      const [r, g, b] = getColor(t);

      const pixelIndex = x * 4;
      lineData.data[pixelIndex] = r;     // Red
      lineData.data[pixelIndex + 1] = g; // Green
      lineData.data[pixelIndex + 2] = b; // Blue
      lineData.data[pixelIndex + 3] = 255; // Alpha
    }
    wctx.putImageData(lineData, 0, 0);
  }

  // Mouse wheel: zoom span around cursor; Ctrl modifies ref level
  function onWheel(e: React.WheelEvent){
    // Do not call preventDefault() here; wheel listeners may be passive in the browser.
    if(e.ctrlKey || e.metaKey){
      const step = e.deltaY < 0 ? 2 : -2; setRefLevel(v=>v+step);
      return;
    }
    const factor = e.deltaY < 0 ? 0.85 : 1.15;
    const newSpan = Math.max(2000, Math.min(2_000_000, span*factor));
    setSpan(newSpan); service.setState({ spanHz: newSpan });
  }

  // Drag pan
  const dragging = useRef(false); const lastX = useRef(0);
  function onMouseDown(e: React.MouseEvent){ dragging.current = true; lastX.current = e.clientX; }
  function onMouseUp(){ dragging.current = false; }
  function onMouseMove(e: React.MouseEvent){
    if(!dragging.current) return; const dx = e.clientX - lastX.current; lastX.current = e.clientX;
    // convert dx px to Hz shift
    const canvas = specRef.current; if(!canvas) return; const HzPerPx = (span / (canvas.clientWidth||1));
    const shift = -dx * HzPerPx; const state = service.getState();
    service.setState({ centerHz: (state.centerHz || 0) + shift });
  }

  // Enhanced mouse interactions
  const dragSelect = useRef(false);
  const selectStart = useRef(0);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 2) return; // ignore right click
    dragging.current = true;
    lastX.current = e.clientX;
    if (e.shiftKey) {
      dragSelect.current = true;
      selectStart.current = e.clientX;
    }
  }

  function onMouseUp(e: React.MouseEvent) {
    if (dragSelect.current) {
      const canvas = specRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x1 = Math.min(selectStart.current, e.clientX) - rect.left;
        const x2 = Math.max(selectStart.current, e.clientX) - rect.left;
        const w = canvas.clientWidth;
        const f1 = (x1 / w) * span + (service.getState().centerHz - span / 2);
        const f2 = (x2 / w) * span + (service.getState().centerHz - span / 2);
        const newSpan = Math.abs(f2 - f1);
        const newCenter = (f1 + f2) / 2;
        setSpan(newSpan);
        service.setState({ spanHz: newSpan, centerHz: newCenter });
      }
    }
    dragging.current = false;
    dragSelect.current = false;
  }

  function onClick(e: React.MouseEvent) {
    if (dragging.current) return; // was a drag
    const canvas = specRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = canvas.clientWidth;
    const freq = (x / w) * span + (service.getState().centerHz - span / 2);

    // Tune radio to clicked frequency
    if (socketService) {
      socketService.setFrequency(Math.round(freq));
    }
  }

  function resetPeaks() {
    peakData.current = null;
  }

  return (
    <div className="space-y-2 select-none">
      {/* Controls */}
      <div className="flex items-center justify-between text-xs text-gray-400 bg-gray-800 p-2 rounded">
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isReceivingData ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{isReceivingData ? 'LIVE' : 'NO DATA'}</span>
          </div>
          <div>Center: {radioState.frequency ? (radioState.frequency/1e6).toFixed(6)+' MHz' : 'N/A'}</div>
          <div className="flex items-center gap-1">
            <span>Span:</span>
            <button className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs" onClick={()=>{const s=10_000; setSpan(s); service.setState({spanHz:s});}}>10k</button>
            <button className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs" onClick={()=>{const s=50_000; setSpan(s); service.setState({spanHz:s});}}>50k</button>
            <button className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs" onClick={()=>{const s=100_000; setSpan(s); service.setState({spanHz:s});}}>100k</button>
            <button className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-xs" onClick={()=>{const s=500_000; setSpan(s); service.setState({spanHz:s});}}>500k</button>
            <span className="text-white">({(span/1000).toFixed(0)} kHz)</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2">
            <span>Ref:</span>
            <input type="range" min="-100" max="0" step="2" value={refLevel} onChange={e=>setRefLevel(+e.target.value)} className="w-16" />
            <span className="text-white w-8">{refLevel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>AVG:</span>
            <input type="range" min="0" max="1" step="0.1" value={avg} onChange={e=>setAvg(+e.target.value)} className="w-16" />
            <span className="text-white w-8">{(avg*100).toFixed(0)}%</span>
          </div>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={peakHold} onChange={e=>setPeakHold(e.target.checked)} />
            <span>Peak</span>
          </label>
          <button onClick={resetPeaks} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs">Reset</button>
          <select value={colorMap} onChange={e=>setColorMap(e.target.value as any)} className="bg-gray-700 text-white rounded px-1 text-xs">
            <option value="modern">Modern</option>
            <option value="classic">Classic</option>
            <option value="thermal">Thermal</option>
          </select>
        </div>
      </div>

      {/* Spectrum Canvas */}
      <div onWheel={onWheel} style={{ height: height - 80 }} className="flex flex-col">
        <canvas
          ref={specRef}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
          onClick={onClick}
          style={{
            width: '100%',
            height: `${Math.floor((height - 80) * 0.6)}px`,
            cursor: dragging.current ? 'grabbing' : 'crosshair',
            display: 'block',
            backgroundColor: '#0f172a'
          }}
        />
        <canvas
          ref={wfRef}
          style={{
            width: '100%',
            height: `${Math.floor((height - 80) * 0.4)}px`,
            display: 'block',
            backgroundColor: '#000'
          }}
        />
      </div>

      <div className="text-xs text-gray-500 text-center">
        {!isReceivingData && (
          <div className="text-yellow-500 mb-1">⚠️ No spectrum data - Start audio in the Audio panel to see live spectrum</div>
        )}
        Wheel: zoom span • Ctrl+Wheel: ref level • Shift+Wheel: averaging • Click: tune • Shift+Drag: zoom region
      </div>
    </div>
  );
};

export default CombinedSpectrumView;

