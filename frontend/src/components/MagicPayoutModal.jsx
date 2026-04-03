import React, { useEffect, useState } from 'react';
import usePayoutStore from '../store/usePayoutStore';
import { CloudLightning, X } from 'lucide-react';

export const MagicPayoutModal = () => {
  const { livePayoutEvent, clearLiveEvent } = usePayoutStore();
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    if (livePayoutEvent) {
      // Animate amount
      setDisplayAmount(0);
      const target = livePayoutEvent.amount || 0;
      const duration = 1500;
      const steps = 30;
      const stepValue = target / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= target) {
          setDisplayAmount(target);
          clearInterval(timer);
        } else {
          setDisplayAmount(Math.floor(current));
        }
      }, duration / steps);

      // Auto dismiss
      const dismissTimer = setTimeout(() => {
        clearLiveEvent();
      }, 5000);

      return () => {
        clearInterval(timer);
        clearTimeout(dismissTimer);
      };
    }
  }, [livePayoutEvent, clearLiveEvent]);

  if (!livePayoutEvent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gradient-to-b from-[#111827] to-[#0A0E17] border border-green-500/30 rounded-2xl p-8 max-w-sm w-full relative shadow-2xl shadow-green-500/20 transform transition-all animate-in zoom-in duration-300">
        
        <button onClick={clearLiveEvent} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
            <CloudLightning className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {livePayoutEvent.triggerType || 'Disruption'} Detected
            </h2>
            <p className="text-sm text-slate-400">
              ✓ You were active and covered
            </p>
          </div>

          <div className="py-6">
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 tracking-tighter">
              ₹{displayAmount}
            </div>
            <p className="text-green-500/80 text-sm font-medium mt-2 animate-pulse">
              Credited to your UPI
            </p>
          </div>

          <p className="text-xs text-slate-500">
            Just now • Income Loss Protection
          </p>
        </div>
      </div>
    </div>
  );
};
