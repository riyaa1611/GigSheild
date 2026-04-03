import React from 'react';

const TRIGGER_MAP = {
  'T-01': { label: 'Heavy Rain', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  'T-02': { label: 'Flash Flood', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
  'T-03': { label: 'Severe AQI', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
  'T-04': { label: 'Extreme Heat', color: 'bg-amber-500/20 text-amber-400 border-amber-500/50' },
  'T-05': { label: 'Curfew / 144', color: 'bg-red-500/20 text-red-500 border-red-500/50' },
  'T-06': { label: 'Cyclone Alert', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
  'T-07': { label: 'Platform Outage', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' }
};

export const TriggerBadge = ({ type }) => {
  const mapping = TRIGGER_MAP[type] || { label: type, color: 'bg-slate-700 text-slate-300 border-slate-600' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${mapping.color}`}>
      <span className="font-mono mr-1 opacity-75">{type}</span>
      {mapping.label}
    </span>
  );
};
