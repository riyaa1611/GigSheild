import React, { useEffect, useState } from 'react';
import { getAdminClaims, getAdminFlaggedClaims, reviewClaim } from '../../services/api';
import { TriggerBadge } from '../../components/TriggerBadge';
import { connectSocket } from '../../services/socket';
import { ShieldCheck, ShieldAlert, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export const ClaimsQueue = () => {
  const [tab, setTab] = useState('review');
  const [autoClaims, setAutoClaims] = useState([]);
  const [reviewClaims, setReviewClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    const socket = connectSocket();
    const handleFlagged = (data) => {
      setReviewClaims(prev => [data, ...prev]);
      toast('New flagged claim requires review!', { icon: '⚠️' });
    };
    
    socket.on('claim:flagged', handleFlagged);
    return () => socket.off('claim:flagged', handleFlagged);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [autoRes, flagRes] = await Promise.all([
        getAdminClaims('approved'), // Mock pulling approved
        getAdminFlaggedClaims()
      ]);
      setAutoClaims(autoRes.data.data || []);
      setReviewClaims(flagRes.data.data || []);
    } catch (e) {
      toast.error('Failed to load queue');
    }
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this claim?`)) return;
    try {
      await reviewClaim(id, action, `Admin manually ${action}d`);
      
      const target = reviewClaims.find(c => c.id === id);
      setReviewClaims(prev => prev.filter(c => c.id !== id));
      
      if (action === 'approve' && target) {
        setAutoClaims(prev => [{...target, status: 'approved'}, ...prev]);
      }
      toast.success(`Claim ${action}d successfully`);
    } catch(e) { toast.error(`Action failed`); }
  };

  const currentList = tab === 'auto' ? autoClaims : reviewClaims;

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Claims Adjudication Queue</h1>
        <div className="flex bg-[#111827] border border-slate-800 rounded-lg p-1">
          <button 
            onClick={() => setTab('review')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${tab === 'review' ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldAlert className="w-4 h-4" />
            Needs Review ({reviewClaims.length})
          </button>
          <button 
            onClick={() => setTab('auto')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${tab === 'auto' ? 'bg-green-500/20 text-green-500' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShieldCheck className="w-4 h-4" />
            Auto-Approved ({autoClaims.length})
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs text-slate-500 uppercase bg-[#0A0E17]/50 sticky top-0 z-10 block w-full table-fixed">
              <tr className="border-b border-slate-800 flex w-full">
                <th className="px-6 py-4 w-[15%]">Worker</th>
                <th className="px-6 py-4 w-[10%]">Zone</th>
                <th className="px-6 py-4 w-[15%]">Trigger</th>
                <th className="px-6 py-4 w-[10%]">Amount</th>
                <th className="px-6 py-4 w-[25%]">Fraud Analytics</th>
                <th className="px-6 py-4 w-[10%]">Status</th>
                {tab === 'review' && <th className="px-6 py-4 w-[15%]">Adjudicate</th>}
              </tr>
            </thead>
            <tbody className="block w-full text-slate-300">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10">Loading queue...</td></tr>
              ) : currentList.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10">Queue empty</td></tr>
              ) : (
                currentList.map(c => {
                  const fraudScore = parseFloat(c.fraud_score || 0);
                  const isHighRisk = fraudScore > 0.7;
                  const isMedRisk = fraudScore > 0.3 && fraudScore <= 0.7;
                  
                  return (
                    <tr key={c.id} className="border-b border-slate-800/50 hover:bg-[#0A0E17]/30 transition-colors flex w-full items-center">
                      <td className="px-6 py-4 w-[15%] font-medium text-white">{c.worker_name || 'Worker'} <span className="text-xs text-slate-500 font-mono block">...{c.user_id?.slice(-4)}</span></td>
                      <td className="px-6 py-4 w-[10%] font-mono">{c.zone_pincode}</td>
                      <td className="px-6 py-4 w-[15%]"><TriggerBadge type={c.trigger_type} /></td>
                      <td className="px-6 py-4 w-[10%] font-bold text-emerald-400">₹{c.payout_amount}</td>
                      <td className="px-6 py-4 w-[25%] space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, fraudScore * 100)}%` }}></div>
                          </div>
                          <span className={`text-xs font-bold ${isHighRisk ? 'text-red-500' : isMedRisk ? 'text-amber-500' : 'text-green-500'}`}>{fraudScore.toFixed(2)}</span>
                        </div>
                        {c.flags && c.flags.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {c.flags.map((f, i) => <span key={i} className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">{f}</span>)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 w-[10%] capitalize">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      {tab === 'review' && (
                        <td className="px-6 py-4 w-[15%] flex gap-2">
                          <button onClick={() => handleAction(c.id, 'approve')} className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleAction(c.id, 'reject')} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
