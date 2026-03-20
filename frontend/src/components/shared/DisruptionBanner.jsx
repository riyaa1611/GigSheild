import React from 'react';
import { AlertTriangle, CheckCircle, CloudRain, Flame, Wind, Waves, ShieldOff } from 'lucide-react';

const TRIGGER_CONFIG = {
  rain: {
    icon: CloudRain,
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    label: 'Heavy Rain Alert',
  },
  heat: {
    icon: Flame,
    color: 'bg-orange-600',
    lightColor: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-800',
    label: 'Extreme Heat Alert',
  },
  aqi: {
    icon: Wind,
    color: 'bg-purple-600',
    lightColor: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-800',
    label: 'Severe AQI Alert',
  },
  flood: {
    icon: Waves,
    color: 'bg-cyan-600',
    lightColor: 'bg-cyan-50 border-cyan-200',
    textColor: 'text-cyan-800',
    label: 'Flood Alert',
  },
  curfew: {
    icon: ShieldOff,
    color: 'bg-red-600',
    lightColor: 'bg-red-50 border-red-200',
    textColor: 'text-red-800',
    label: 'Curfew / Lockdown',
  },
};

export default function DisruptionBanner({ disruptions = [], zoneName = '' }) {
  if (!disruptions || disruptions.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
        <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-emerald-800 text-sm">
            Your zone is clear today
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            No active disruptions detected in {zoneName || 'your zone'}. You're good to ride!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {disruptions.map((disruption, idx) => {
        const type = disruption.type?.toLowerCase() || 'rain';
        const config = TRIGGER_CONFIG[type] || TRIGGER_CONFIG.rain;
        const Icon = config.icon;

        return (
          <div
            key={idx}
            className={`flex items-start gap-3 ${config.lightColor} border rounded-2xl px-5 py-4`}
          >
            <div className={`flex-shrink-0 w-10 h-10 ${config.color} rounded-full flex items-center justify-center shadow-sm`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-bold text-sm ${config.textColor}`}>
                  {config.label} in {zoneName || disruption.zone || 'your zone'}
                </p>
                <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  ACTIVE
                </span>
              </div>
              <p className={`text-xs mt-1 ${config.textColor} opacity-80`}>
                Auto-claim is being processed for eligible workers.{' '}
                {disruption.started_at && (
                  <span>Active since {new Date(disruption.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.</span>
                )}
              </p>
              {disruption.severity && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-600">Severity:</span>
                  <span className={`text-xs font-bold ${config.textColor}`}>
                    {disruption.severity}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
