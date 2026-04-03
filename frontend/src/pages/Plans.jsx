import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, subscribePlan } from '../services/api';
import usePolicyStore from '../store/usePolicyStore';
import toast from 'react-hot-toast';
import { TriggerBadge } from '../components/TriggerBadge';

export const Plans = () => {
  const navigate = useNavigate();
  const { plans, setPlans } = usePolicyStore();
  const [loading, setLoading] = useState(true);
  const [upi, setUpi] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await getPlans();
        setPlans(res.data.plans);
      } catch(err) {
        toast.error('Failed to load plans');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [setPlans]);

  const handleSubscribe = async (planType) => {
    if (!upi) return toast.error('Enter UPI handle for AutoPay');
    setSubscribing(true);
    try {
      await subscribePlan(planType, upi);
      toast.success('Subscribed successfully!');
      navigate('/dashboard');
    } catch(err) {
      toast.error(err.response?.data?.message || 'Subscription failed');
    }
    setSubscribing(false);
  };

  if (loading) return <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center text-slate-400">Loading personalized plans...</div>;

  return (
    <div className="min-h-screen bg-[#0A0E17] p-6 pb-24 text-white overflow-y-auto">
      <div className="max-w-md mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Protect your earnings</h1>
          <p className="text-slate-400 text-sm">Income Loss Protection — Parametric. Personalized for your zone.</p>
        </div>

        <div className="space-y-4">
          <label className="text-sm font-medium text-slate-300">AutoPay UPI Handle</label>
          <input
            type="text"
            placeholder="e.g. 9876543210@ybl"
            className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 mb-6"
            value={upi}
            onChange={(e) => setUpi(e.target.value)}
          />
        </div>

        {Object.entries(plans || {}).map(([key, plan]) => (
          <div key={key} className={`relative p-5 rounded-2xl border ${key === 'pro' ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-800 bg-[#111827]'}`}>
            {key === 'pro' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
            )}
            
            <div className="flex justify-between items-start mb-4 mt-2">
              <div>
                <h3 className="text-xl font-bold capitalize">{key}Shield</h3>
                <p className="text-slate-400 text-sm">Up to ₹{plan.coverageCap} coverage/week</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 leading-none">
                  ₹{plan.adjustedPremium}
                </span>
                <span className="block text-xs text-slate-500 mt-1">/ week</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Covered Triggers</p>
              <div className="flex flex-wrap gap-2">
                {plan.triggers.map(t => <TriggerBadge key={t} type={t} />)}
              </div>
            </div>

            <button 
              onClick={() => handleSubscribe(key)}
              disabled={subscribing}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${key === 'pro' ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            >
              Get {key}Shield
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
