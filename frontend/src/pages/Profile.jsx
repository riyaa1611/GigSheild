import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { cancelPolicy, getActivePolicy } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import { Shield, Smartphone, Star, MapPin, SearchCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Profile = () => {
  const { user, logout, aadhaarVerified, platformLinked } = useAuthStore();
  const [policy, setPolicy] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getActivePolicy().then(res => setPolicy(res.data.policy)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/onboarding');
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your income protection?")) return;
    setCancelling(true);
    try {
      const res = await cancelPolicy();
      toast.success(res.data.refundAmount ? `Cancelled. ₹${res.data.refundAmount} refunded.` : 'Policy Cancelled');
      setPolicy(null);
    } catch(err) { toast.error('Failed to cancel'); }
    setCancelling(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] p-6 pb-24 text-white overflow-y-auto">
      <div className="max-w-md mx-auto space-y-6">
        
        <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-black text-slate-300">
            {user?.phone ? user.phone.substring(0,2) : 'A1'}
          </div>
          <div>
            <p className="text-lg font-bold">Worker PWA</p>
            <p className="text-slate-400 font-mono text-sm">+91 ******{user?.phone?.slice(-4) || '0000'}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <Smartphone className="text-indigo-400 w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Identity Verification</p>
              <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Aadhaar Verified
              </p>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <SearchCheck className="text-indigo-400 w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Gig Platform</p>
              <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide">ZOM-**** ID Linked</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <MapPin className="text-indigo-400 w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Operating Zone</p>
              <p className="text-xs text-slate-400 mt-0.5">Mumbai Metro • 400001</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <Star className="text-amber-400 w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Loyalty Standing</p>
              <p className="text-xs text-amber-400 font-semibold mt-0.5 flex items-center gap-1.5">
                Gold Sentinel <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Fraud-clean</span>
              </p>
            </div>
          </div>
        </div>

        {policy && (
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Active Policy</h3>
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 flex justify-between items-center mb-4">
              <div>
                <p className="capitalize font-bold text-lg flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> {policy.plan_type}Shield
                </p>
                <p className="text-xs text-slate-400">Valid till Sun 23:59</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white mb-0.5">₹{policy.weekly_premium}</p>
                <p className="text-[10px] text-slate-500 font-mono">/ week</p>
              </div>
            </div>
            
            <button 
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs text-red-500/80 hover:text-red-500 underline underline-offset-2"
            >
              Cancel {policy.plan_type === 'ultra' ? 'and calculate partial refund' : 'policy'}
            </button>
          </div>
        )}

        <div className="mt-12">
          <button 
            onClick={handleLogout}
            className="w-full bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl py-3 font-semibold hover:bg-red-500/20 transition-colors"
          >
            Sign Out
          </button>
        </div>

      </div>
      <BottomNav />
    </div>
  );
};
