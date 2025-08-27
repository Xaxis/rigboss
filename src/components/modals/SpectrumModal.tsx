import React from 'react';
import { ensureSpectrumConnected } from '@/spectrum';
import CombinedSpectrumView from '@/components/spectrum/CombinedSpectrumView';

type SpectrumMode = 'combined' | 'spectrum' | 'waterfall';

const SpectrumModal: React.FC<{ open: boolean; mode: SpectrumMode; onClose: () => void }>=({open, mode, onClose})=>{
  React.useEffect(()=>{ if(open) ensureSpectrumConnected(); },[open]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-gray-900 w-[96vw] h-[92vh] rounded-lg border border-gray-700 shadow-2xl p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-200 text-sm capitalize">{mode} view</div>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        <div className="w-full h-[calc(100%-28px)]">
          <CombinedSpectrumView height={window.innerHeight*0.85} />
        </div>
      </div>
    </div>
  );
};

export default SpectrumModal;

