import React, { useEffect, useRef, useState } from 'react';
import type { SpectrumFrame } from '@/spectrum/SpectrumService';
import { ensureSpectrumConnected, spectrumService } from '@/spectrum';
import { useAppStore } from '@/stores/appStore';

const CombinedSpectrumView: React.FC<{ height?: number }> = ({ height = 300 }) => {
  const { radioState } = useAppStore();
  const specRef = useRef<HTMLCanvasElement>(null);
  const wfRef = useRef<HTMLCanvasElement>(null);
  const service = spectrumService;
  const [span, setSpan] = useState(100_000);
  const [refLevel, setRefLevel] = useState(-40);

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

  function draw(frame: SpectrumFrame) {
    const spec = specRef.current; const wf = wfRef.current; if (!spec || !wf) return;
    const w = spec.clientWidth || 800; const h = spec.clientHeight || height;
    spec.width = w; spec.height = Math.floor(height * 0.55);
    wf.width = w; wf.height = Math.floor(height * 0.45);

    const ctx = spec.getContext('2d')!; const bins = frame.bins; const n = bins.length;
    ctx.clearRect(0,0,spec.width,spec.height);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,spec.width,spec.height);

    // grid
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.5;
    for (let i=0;i<=10;i++){ const x=i*spec.width/10; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,spec.height); ctx.stroke(); }
    for (let i=0;i<=6;i++){ const y=i*spec.height/6; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(spec.width,y); ctx.stroke(); }

    // spectrum line
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i=0;i<n;i++){
      const x = (i/(n-1))*spec.width; const db = bins[i];
      const y = spec.height - ((db + 140)/120)*spec.height;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // waterfall: shift and draw a new row
    const wctx = wf.getContext('2d')!;
    const img = wctx.getImageData(0,0,wf.width,wf.height);
    wctx.putImageData(img,0,1); // scroll down
    for (let x=0; x<wf.width; x++){
      const i = Math.floor((x/wf.width)*n);
      const db = bins[i];
      const t = Math.max(0, Math.min(1, (db - (refLevel-80)) / 80));
      // modern colormap simple gradient
      const r = Math.floor(255 * t);
      const g = Math.floor(255 * Math.max(0, Math.min(1, (t-0.3)/0.7)));
      const b = Math.floor(255 * (1 - t));
      wctx.fillStyle = `rgb(${r},${g},${b})`;
      wctx.fillRect(x,0,1,1);
    }
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

  return (
    <div className="space-y-2 select-none" onWheel={onWheel}>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div>Center: {radioState.frequency ? (radioState.frequency/1e6).toFixed(6)+' MHz' : 'N/A'}</div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <span>Span</span>
            <button className="px-1.5 py-0.5 border rounded" onClick={()=>{const s=10_000; setSpan(s); service.setState({spanHz:s});}}>10k</button>
            <button className="px-1.5 py-0.5 border rounded" onClick={()=>{const s=50_000; setSpan(s); service.setState({spanHz:s});}}>50k</button>
            <button className="px-1.5 py-0.5 border rounded" onClick={()=>{const s=100_000; setSpan(s); service.setState({spanHz:s});}}>100k</button>
            <button className="px-1.5 py-0.5 border rounded" onClick={()=>{const s=500_000; setSpan(s); service.setState({spanHz:s});}}>500k</button>
          </div>
          <div>Ref: {refLevel} dB</div>
        </div>
      </div>
      <canvas ref={specRef} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseMove={onMouseMove} style={{ width: '100%', height: Math.floor(height*0.55), cursor: dragging.current ? 'grabbing' : 'crosshair' }} />
      <canvas ref={wfRef} style={{ width: '100%', height: Math.floor(height*0.45) }} />
    </div>
  );
};

export default CombinedSpectrumView;

