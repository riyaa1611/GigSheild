import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getAdminForecast } from '../../services/api';
import toast from 'react-hot-toast';

export const ForecastMap = () => {
  const [zones, setZones] = useState([]);

  useEffect(() => {
    getAdminForecast().then(res => {
      setZones(res.data.data.zones || []); // mock ML format { status, zones: [{pincode, lat, lng, risk_score}] }
    }).catch(() => {
      toast.error('Failed to load forecast data');
    });
  }, []);

  const getColor = (score) => {
    if (score > 0.8) return '#ef4444'; // critical red
    if (score > 0.6) return '#f97316'; // high orange
    if (score > 0.3) return '#f59e0b'; // med amber
    return '#10b981'; // low green
  };

  const sorted = [...zones].sort((a,b) => b.risk_score - a.risk_score).slice(0,5);

  const handleNudge = (pincode) => {
    toast.success(`Push notification dispatched to workers in ${pincode}`);
  };

  return (
    <div className="h-full flex gap-6">
      <div className="flex-1 bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden relative">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; CARTO'
          />
          {zones.map((z, idx) => (
            <CircleMarker
              key={idx}
              center={[z.lat, z.lng]}
              radius={Math.max(8, z.risk_score * 30)}
              pathOptions={{
                color: getColor(z.risk_score),
                fillColor: getColor(z.risk_score),
                fillOpacity: 0.6,
                weight: 1
              }}
            >
              <LeafletTooltip className="bg-[#111827] border-slate-800 text-slate-300">
                <span className="font-mono">Zone: {z.pincode}</span><br />
                Risk: {(z.risk_score * 100).toFixed(1)}%
              </LeafletTooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute bottom-4 left-4 bg-[#111827]/90 backdrop-blur rounded-xl p-3 z-[400] text-xs">
           <p className="font-bold mb-2 uppercase tracking-wide text-slate-400">Risk Severity</p>
           <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 bg-red-500 rounded"></span> Critical {'>'}0.8</div>
           <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 bg-orange-500 rounded"></span> High {'>'}0.6</div>
           <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 bg-amber-500 rounded"></span> Medium {'>'}0.3</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded"></span> Low {'<'}0.3</div>
        </div>
      </div>

      <div className="w-80 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col shrink-0 flex-1">
        <div className="p-5 border-b border-slate-800">
          <h2 className="font-bold">Next-Week Forecast</h2>
          <p className="text-xs text-slate-400">7-Day LSTM Disruption Vector</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sorted.length === 0 && <p className="text-sm text-slate-500 text-center mt-10">Running LSTM projections...</p>}
          {sorted.map((z, idx) => (
             <div key={idx} className="bg-[#0A0E17] border border-slate-800 rounded-xl p-4">
               <div className="flex justify-between items-center border-b border-slate-800/50 pb-2 mb-2">
                 <span className="font-mono font-bold text-white text-lg">{z.pincode}</span>
                 <span className="font-bold" style={{color: getColor(z.risk_score)}}>{(z.risk_score * 100).toFixed(0)}% Risk</span>
               </div>
               <p className="text-xs text-slate-400 mb-4 line-clamp-2">High probability of sequential disruption based on recent atmospheric pressure drops and structural indicators.</p>
               <button 
                 onClick={() => handleNudge(z.pincode)}
                 className="w-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors py-2 rounded-lg"
               >
                 Nudge Workers
               </button>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};
