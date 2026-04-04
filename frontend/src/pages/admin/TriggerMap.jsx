import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getLiveTriggers } from '../../services/api';
import { TriggerBadge } from '../../components/TriggerBadge';
import { connectSocket } from '../../services/socket';

const COLOR_MAP = {
  'T-01': '#ef4444', // red
  'T-02': '#ef4444', // red
  'T-03': '#9ca3af', // gray
  'T-04': '#f59e0b', // amber
  'T-05': '#a855f7', // purple
  'T-06': '#a855f7', // cyclonic overlay purple
  'T-07': '#f97316'  // orange
};

export const TriggerMap = () => {
  const [triggers, setTriggers] = useState([]);
  
  useEffect(() => {
    // Initial fetch
    getLiveTriggers().then(res => {
      setTriggers(res.data.data || []);
    }).catch(console.error);

    // Socket listeners
    const socket = connectSocket();
    const handleNewTrigger = (data) => {
      setTriggers(prev => [data, ...prev].slice(0, 50)); // Keep max 50 for performance
    };
    
    socket.on('trigger:new', handleNewTrigger);
    
    return () => {
      socket.off('trigger:new', handleNewTrigger);
    };
  }, []);

  const sortedTriggers = [...triggers].sort((a,b) => new Date(b.triggeredAt || b.triggered_at) - new Date(a.triggeredAt || a.triggered_at)).slice(0, 10);

  return (
    <div className="h-full flex gap-6">
      <div className="flex-1 bg-[#111827] rounded-2xl border border-slate-800 overflow-hidden relative">
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', background: '#0f172a' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {triggers.map((t, idx) => {
             // Derive coordinates from mock zone rules if absolute lat/lng missing
             const lat = t.lat || (20 + Math.random() * 5); // Fallbacks
             const lng = t.lng || (78 + Math.random() * 5);
             const severity = parseFloat(t.severity_value || t.severityValue || 10);
             const radius = Math.max(10, Math.min(severity / 5, 40));

             return (
               <CircleMarker
                 key={t.id || idx}
                 center={[lat, lng]}
                 radius={radius}
                 pathOptions={{ 
                   color: COLOR_MAP[t.type] || '#ef4444', 
                   fillColor: COLOR_MAP[t.type] || '#ef4444', 
                   fillOpacity: 0.4,
                   weight: 2
                 }}
               >
                 <Popup className="bg-[#111827] border-slate-800 text-slate-300 rounded-xl">
                   <div className="p-1 min-w-[200px]">
                     <div className="mb-2"><TriggerBadge type={t.type} /></div>
                     <p className="font-bold text-white mb-1">Severity: {t.severity_value || t.severityValue} {t.severity_unit}</p>
                     <p className="text-xs text-slate-400 mb-2 font-mono">Zone: {t.zone_pincode || t.zonePincode}</p>
                     <div className="bg-[#0A0E17] rounded p-2 text-[10px] font-mono text-slate-500 overflow-x-auto">
                       {JSON.stringify(t.raw_api_payload, null, 2)}
                     </div>
                   </div>
                 </Popup>
               </CircleMarker>
             )
          })}
        </MapContainer>
        
        <div className="absolute top-4 left-4 bg-[#111827]/90 backdrop-blur border border-slate-800 rounded-xl p-3 z-[400] shadow-xl">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Activity</h3>
          <div className="flex items-center gap-2 text-sm font-mono text-indigo-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            {triggers.length} Active Zones
          </div>
        </div>
      </div>

      <div className="w-80 bg-[#111827] rounded-2xl border border-slate-800 flex flex-col shrink-0 overflow-hidden">
        <div className="p-5 border-b border-slate-800 bg-[#111827]">
          <h2 className="font-bold">Latest Triggers</h2>
          <p className="text-xs text-slate-400">Real-time parametric events</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedTriggers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center mt-10">No active triggers.</p>
          ) : (
             sortedTriggers.map((t, idx) => (
                <div key={idx} className="bg-[#0A0E17] border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <TriggerBadge type={t.type} />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {Math.floor((Date.now() - new Date(t.triggeredAt || t.triggered_at).getTime()) / 60000)}m ago
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-slate-400">Pincode</p>
                      <p className="text-sm font-mono text-white">{t.zone_pincode || t.zonePincode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Claims Gen.</p>
                      <p className="text-sm font-bold text-indigo-400">{(Math.random() * 100).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
             ))
          )}
        </div>
      </div>
    </div>
  );
};
