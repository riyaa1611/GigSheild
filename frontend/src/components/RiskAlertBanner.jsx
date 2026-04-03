import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { TriggerBadge } from './TriggerBadge';

export const RiskAlertBanner = ({ trigger, onDismiss }) => {
  if (!trigger) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 right-0 p-4" onClick={onDismiss}>
        <X className="w-5 h-5 text-amber-500/50 cursor-pointer hover:text-amber-500 transition-colors" />
      </div>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-amber-500 font-semibold mb-1 flex items-center gap-2">
            ⚠️ Risk Detected
            <TriggerBadge type={trigger.type} />
          </h4>
          <p className="text-amber-200/80 text-sm leading-relaxed">
            {trigger.desc || 'Disruption'} active in zone <span className="font-mono text-amber-400">{trigger.zonePincode}</span> | Monitoring your coverage
          </p>
        </div>
      </div>
    </div>
  );
};
