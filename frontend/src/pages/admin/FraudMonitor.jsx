import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getAdminFraudStats } from '../../services/api';
import toast from 'react-hot-toast';

export const FraudMonitor = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminFraudStats().then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load fraud stats');
      setLoading(false);
    });
  }, []);

  if (loading || !stats) return <div className="p-10 text-slate-400">Loading Intelligence...</div>;

  const histogramData = [
    { name: '0.0 - 0.3', count: stats.fraudScoreDistribution['0-0.3'], color: '#10b981' },
    { name: '0.3 - 0.7', count: stats.fraudScoreDistribution['0.3-0.7'], color: '#f59e0b' },
    { name: '0.7 - 1.0', count: stats.fraudScoreDistribution['0.7-1.0'], color: '#ef4444' }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fraud Intelligence Engine</h1>
      
      <div className="grid grid-cols-3 gap-6">
        
        {/* Histogram */}
        <div className="col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-2">Isolation Forest Deviation Scores</h3>
          <p className="text-sm text-slate-400 mb-6">Distribution of claims by anomaly metric</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData}>
                <XAxis dataKey="name" stroke="#64748b" />
                <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {histogramData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Signals */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-4">Top Fraud Signals</h3>
          <div className="flex-1 space-y-4">
             {stats.topFraudSignals?.map((s, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{s.signal}</span>
                    <span className="font-bold text-slate-400">{s.count} claims</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, s.count * 2)}%` }}></div>
                  </div>
                </div>
             ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-800">
            <h4 className="text-sm font-semibold mb-2 text-slate-400">ML Model Health</h4>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">IForest Vectorizer v1.2</span>
              <span className="text-green-400 font-mono">Healthy</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">XGBoost Premium v2.0</span>
              <span className="text-green-400 font-mono">Healthy</span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};
