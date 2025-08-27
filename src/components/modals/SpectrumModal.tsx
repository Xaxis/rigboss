import React from 'react';
import { ensureSpectrumConnected } from '@/spectrum';
import CombinedSpectrumView from '@/components/spectrum/CombinedSpectrumView';

type SpectrumMode = 'combined' | 'spectrum' | 'waterfall';

const SpectrumModal: React.FC<{ open: boolean; mode: SpectrumMode; onClose: () => void }> = ({ open, mode, onClose }) => {
  React.useEffect(() => { if (open) ensureSpectrumConnected(); }, [open]);

  if (!open) return null;

  const modalHeight = window.innerHeight * 0.92;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-gray-900 w-[98vw] h-[94vh] rounded-lg border border-gray-700 shadow-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-gray-200 text-lg font-medium capitalize">{mode} Analyzer</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="w-full h-[calc(100%-48px)]">
          <CombinedSpectrumView height={modalHeight - 80} />
        </div>
      </div>
    </div>
  );
};

export default SpectrumModal;

