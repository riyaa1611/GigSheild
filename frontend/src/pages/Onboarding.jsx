import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp, verifyAadhaarMock, linkPlatform } from '../services/api';
import useAuthStore from '../store/useAuthStore';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [platform, setPlatform] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, setAadhaarVerified, setPlatformLinked, user } = useAuthStore();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (phone.length < 10) return toast.error('Enter valid 10-digit number');
    setLoading(true);
    try {
      await sendOtp(phone);
      toast.success('OTP sent successfully');
      setStep(2);
    } catch(err) { toast.error('Failed to send OTP'); }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    try {
      const res = await verifyOtp(phone, otp);
      login(res.data.token, { id: res.data.userId, phone });
      toast.success('Logged in successfully');
      setStep(3);
    } catch(err) { toast.error('Invalid OTP'); }
    setLoading(false);
  };

  const handleAadhaar = async (e) => {
    e.preventDefault();
    if (aadhaar.length < 12) return toast.error('Enter 12 digits');
    setLoading(true);
    try {
      await verifyAadhaarMock(user.id, aadhaar);
      setAadhaarVerified();
      toast.success('Aadhaar verified');
      setStep(4);
    } catch(err) { toast.error('Aadhaar verification failed'); }
    setLoading(false);
  };

  const handlePlatform = async (e) => {
    e.preventDefault();
    if (!platform || !platformId) return toast.error('Fill platform details');
    setLoading(true);
    try {
      await linkPlatform(user.id, platform, platformId);
      setPlatformLinked();
      toast.success('Platform Linked');
      navigate('/plans');
    } catch(err) { toast.error('Platform linking failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col p-6 items-center justify-center">
      <div className="max-w-sm w-full space-y-8">
        
        <div className="text-center space-y-3 mb-10">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">GigShield</h1>
          <p className="text-slate-400 text-sm">Income Loss Protection — Parametric</p>
        </div>

        {/* Step 1 & 2: Auth */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold mb-6">Enter phone number</h2>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 mt-4">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold mb-6">Enter OTP sent to {phone}</h2>
            <input
              type="text"
              placeholder="6-digit OTP"
              className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors tracking-widest text-lg"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 mt-4">
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}

        {/* Step 3: Aadhaar */}
        {step === 3 && (
          <form onSubmit={handleAadhaar} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-6">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-semibold">Verify Identity</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">Required by IRDAI regulations.</p>
            <input
              type="text"
              placeholder="12-digit Aadhaar Number"
              className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
              value={aadhaar}
              onChange={(e) => setAadhaar(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 mt-4">
              {loading ? 'Verifying...' : 'Verify Identity'}
            </button>
          </form>
        )}

        {/* Step 4: Platform */}
        {step === 4 && (
          <form onSubmit={handlePlatform} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold mb-6">Select Platform</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {['Zomato', 'Swiggy', 'Zepto', 'Blinkit'].map(p => (
                <div 
                  key={p} 
                  onClick={() => setPlatform(p.toLowerCase())}
                  className={`border rounded-xl p-4 text-center cursor-pointer transition-all ${platform === p.toLowerCase() ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-[#111827]'}`}
                >
                  <span className="font-medium text-slate-300">{p}</span>
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="Platform ID (e.g., ZOM-1234)"
              className="w-full bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
              value={platformId}
              onChange={(e) => setPlatformId(e.target.value)}
            />
            <button disabled={loading} className="w-full bg-indigo-500 text-white rounded-xl py-3 font-semibold disabled:opacity-50 mt-4">
              {loading ? 'Linking...' : 'Complete Setup'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
