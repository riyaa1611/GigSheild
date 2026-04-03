import React, { useEffect, useState } from 'react';
import { BottomNav } from '../components/BottomNav';
import { getPayoutHistory } from '../services/api';
import usePayoutStore from '../store/usePayoutStore';
import { TriggerBadge } from '../components/TriggerBadge';
import { Clock, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export const Payouts = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const { payouts, setPayouts, totalProtected } = usePayoutStore();

  const loadData = async (isRef = false) => {
    isRef ? setRefreshing(true) : setLoading(true);
    try {
      const res = await getPayoutHistory();
      setPayouts(res.data.data);
    } catch(e) { toast.error('Failed to load payouts'); }
    isRef ? setRefreshing(false) : setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = payouts.filter(p => filter === 'All' ? true : p.status.toLowerCase() === filter.toLowerCase());

  return (
    <div className="min-h-screen bg-[#0A0E17] p-6 pb-24 text-white overflow-y-auto">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Payouts history</h1>
          <button onClick={() => loadData(true)} className={`text-slate-400 hover:text-white transition-all ${refreshing ? 'animate-spin text-indigo-400' : ''}`}>
             <RefreshCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
          <p className="text-sm font-medium text-emerald-400/80 mb-1">Lifetime Protected Amount</p>
          <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
            ₹{totalProtected || 0}
          </div>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {['All', 'Success', 'Processing', 'Failed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-slate-200 text-slate-900' : 'bg-[#111827] text-slate-400 border border-slate-800'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 py-10">Loading payouts...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center bg-[#111827] border border-slate-800 rounded-xl p-8">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No disruptions claimed yet. You're covered.</p>
            </div>
          ) : (
             filtered.map((item, idx) => (
               <div key={idx} className="bg-[#111827] border border-slate-800 hover:border-slate-700 transition-colors rounded-xl p-4 flex justify-between items-center">
                 <div>
                   <TriggerBadge type={item.trigger_type} />
                   <div className="flex items-center gap-2 mt-2">
                     <span className={`h-1.5 w-1.5 rounded-full ${item.status === 'success' ? 'bg-green-500' : item.status === 'processing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></span>
                     <p className="text-xs text-slate-400 capitalize">{item.status}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <p className="text-lg font-bold text-white mb-0.5">₹{item.amount}</p>
                   <p className="text-[10px] text-slate-500 font-mono">Paid within {Math.round(item.payout_time_minutes||0)}m</p>
                 </div>
               </div>
             ))
          )}
        </div>

      </div>
      <BottomNav />
    </div>
  );
};
