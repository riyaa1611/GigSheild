import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivePolicy, getLiveTriggers, getPayoutHistory } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import { BottomNav } from '../components/BottomNav';
import { RiskAlertBanner } from '../components/RiskAlertBanner';
import { MagicPayoutModal } from '../components/MagicPayoutModal';
import { TriggerBadge } from '../components/TriggerBadge';
import { ShieldCheck, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { connectSocket } from '../services/socket';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [policy, setPolicy] = useState(null);
  const [trigger, setTrigger] = useState(null);
  const [recentPayout, setRecentPayout] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    connectSocket(user?.id);
    
    const loadDashboard = async () => {
      try {
        const [polRes, trigRes, payRes] = await Promise.all([
          getActivePolicy(),
          getLiveTriggers(),
          getPayoutHistory()
        ]);
        
        setPolicy(polRes.data.policy);
        
        if (trigRes.data.data?.length > 0) {
          // just mock selecting the first one
          setTrigger(trigRes.data.data[0]);
        }
        
        if (payRes.data.data?.length > 0) {
          setRecentPayout(payRes.data.data[0]);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          navigate('/plans');
        } else {
          toast.error('Failed to load dashboard data');
        }
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [user, navigate]);

  if (loading) return <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center text-slate-400">Loading your protection dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#0A0E17] p-6 pb-24 text-white overflow-y-auto">
      <MagicPayoutModal />
      
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-xl font-bold">Hey, {user?.phone?.substring(0,5) || 'Worker'}</h1>
            <p className="text-sm text-slate-400">Your income is protected</p>
          </div>
          <div className="flex items-center gap-2 bg-[#111827] px-3 py-1.5 rounded-full border border-slate-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-300">Active</span>
          </div>
        </div>

        <RiskAlertBanner trigger={trigger} onDismiss={() => setTrigger(null)} />

        <div className="bg-gradient-to-br from-[#111827] to-[#0A0E17] border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <h2 className="font-semibold text-lg">Earnings Protected</h2>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-slate-400 mb-1">This Week (Mock)</p>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">₹{policy?.coverageCap || 900}</span>
              <span className="text-sm font-medium text-slate-500">of ₹2500 earned</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-green-400 to-indigo-500 h-1.5 rounded-full" style={{ width: '35%' }}></div>
            </div>
          </div>
          
          {policy && (
            <div className="bg-black/20 rounded-xl p-3 border border-white/5 flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold capitalize">{policy.plan_type}Shield</p>
                <p className="text-[10px] text-slate-400 flex items-center">Valid till Sun 23:59</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Premium</p>
                <p className="text-sm font-bold text-slate-300">₹{policy.weekly_premium}/wk</p>
              </div>
            </div>
          )}
        </div>

        {recentPayout && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wide">
              <History className="w-4 h-4" /> Recent Payout
            </h3>
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex justify-between items-center">
              <div>
                <TriggerBadge type={recentPayout.trigger_type} />
                <p className="text-xs text-slate-500 mt-2">Just transferred</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-green-400">+₹{recentPayout.amount}</span>
                <p className="text-xs text-slate-400 capitalize">{recentPayout.status}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
