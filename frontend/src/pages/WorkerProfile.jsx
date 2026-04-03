import React from 'react';
import { Shield, Settings, HelpCircle, LogOut, CheckCircle2, ChevronRight, Fingerprint, Briefcase, User, Wallet, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const WorkerProfile = () => {
  // TODO: connect to API for getting user verification status and current coverage plan details
  const { user, logout } = useAuth();
  
  const userName = user?.name || "Raju Mane";
  
  return (
    <div className="min-h-screen bg-[#131313] text-white flex flex-col font-['Inter',sans-serif] pb-24">
      {/* Top Header */}
      <header className="px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-[#adc6ff] fill-[#adc6ff]" />
          <h1 className="text-[22px] font-bold tracking-wide font-['Plus_Jakarta_Sans',sans-serif]">Profile</h1>
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-gray-600 flex items-center justify-center opacity-70">
            <User className="w-5 h-5 text-gray-400" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-6 flex-1 flex flex-col gap-10">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-[120px] h-[120px] rounded-2xl overflow-hidden bg-[#fde047] relative">
               <img 
                 src="https://api.dicebear.com/7.x/avataaars/svg?seed=Raju&style=circle" 
                 alt={userName} 
                 className="w-full h-full object-cover scale-150 translate-y-3" 
               />
            </div>
            {/* Verified Badge */}
            <div className="absolute -bottom-2 -right-3 bg-[#4edea3] rounded-full border-[3px] border-[#131313] w-7 h-7 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[#131313]" />
            </div>
          </div>
          
          <h2 className="mt-6 text-[32px] leading-none font-bold font-['Plus_Jakarta_Sans',sans-serif] tracking-tight">{userName}</h2>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
            <span className="text-[#4edea3] text-[11px] font-bold tracking-[0.05em] uppercase">VERIFIED SENTINEL</span>
          </div>
        </div>

        {/* VERIFICATION STATUS */}
        <section className="flex flex-col gap-4">
          <h3 className="text-[11px] text-gray-400 font-bold tracking-[0.1em] uppercase">Verification Status</h3>
          <div className="grid grid-cols-2 gap-4">
            
            {/* Aadhaar Card */}
            <div className="bg-[#1c1b1b] rounded-2xl p-4 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <Fingerprint className="w-6 h-6 text-[#adc6ff] opacity-80" />
                <div className="bg-[#4edea3]/10 text-[#4edea3] text-[9px] font-bold px-2 py-1 rounded-sm tracking-wider">
                  VERIFIED
                </div>
              </div>
              <div className="mb-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Document</p>
                <p className="text-base font-semibold">Aadhaar</p>
              </div>
            </div>

            {/* Platform ID Card */}
            <div className="bg-[#1c1b1b] rounded-2xl p-4 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <Briefcase className="w-6 h-6 text-[#adc6ff] opacity-80" />
                <div className="bg-[#4edea3]/10 text-[#4edea3] text-[9px] font-bold px-2 py-1 rounded-sm tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                  ACTIVE
                </div>
              </div>
              <div className="mb-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Platform ID</p>
                <p className="text-base font-semibold">Zomato</p>
              </div>
            </div>

          </div>
        </section>

        {/* CURRENT COVERAGE */}
        <section className="flex flex-col gap-4">
          <h3 className="text-[11px] text-gray-400 font-bold tracking-[0.1em] uppercase">Current Coverage</h3>
          
          <div className="bg-[#1c1b1b] rounded-2xl p-5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[22px] font-bold font-['Plus_Jakarta_Sans',sans-serif] mb-0.5">ProShield</h4>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[#adc6ff] font-bold text-xl leading-none">₹49</span>
                  <span className="text-gray-400 text-xs">/wk</span>
                </div>
              </div>
              <button className="bg-gradient-to-br from-[#adc6ff] to-[#4d8eff] text-[#131313] font-bold text-sm px-5 py-3 rounded-xl hover:opacity-90 transition-opacity">
                Manage<br/>Plan
              </button>
            </div>
            
            <div className="bg-[#353534] rounded-xl p-3 flex items-start gap-3">
               <div className="mt-0.5 flex-shrink-0">
                 <div className="w-4 h-4 rounded-full bg-[#4edea3] flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-[#131313]" />
                 </div>
               </div>
               <div className="text-[13px] text-gray-300 font-medium leading-relaxed">
                 Income Loss Protection Covered:
                 <div className="text-gray-400 mt-0.5 leading-snug">
                   Heavy Rain, AQI Alert, Curfew, Platform Outage
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* ACCOUNT & SUPPORT */}
        <section className="flex flex-col gap-4 mb-8">
          <h3 className="text-[11px] text-gray-400 font-bold tracking-[0.1em] uppercase">Account & Support</h3>
          
          <div className="bg-[#1c1b1b] rounded-2xl p-2">
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors">
              <div className="flex items-center gap-4">
                <Settings className="w-[18px] h-[18px] text-gray-400" />
                <span className="text-[15px] font-medium text-gray-200">App Preferences</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors mt-1">
              <div className="flex items-center gap-4">
                <HelpCircle className="w-[18px] h-[18px] text-gray-400" />
                <span className="text-[15px] font-medium text-gray-200">Help & Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            
            <button onClick={logout} className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors mt-2 border-t border-white/5">
              <div className="flex items-center gap-4">
                <LogOut className="w-[18px] h-[18px] text-red-400" />
                <span className="text-[15px] font-medium text-red-400">Log Out</span>
              </div>
            </button>
          </div>
        </section>

      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] px-2 py-3 z-50 flex items-center justify-around pb-6 pt-4">
        <Link to="/dashboard" className="flex flex-col items-center gap-2 px-3 py-1 flex-1 text-gray-500 hover:text-gray-300">
          <Wallet className="w-6 h-6 opacity-80" />
          <span className="text-[9px] font-bold tracking-[0.05em]">EARNINGS</span>
        </Link>
        <Link to="/policies" className="flex flex-col items-center gap-2 px-3 py-1 flex-1 text-gray-500 hover:text-gray-300">
          <Shield className="w-6 h-6 opacity-80" />
          <span className="text-[9px] font-bold tracking-[0.05em]">SHIELDS</span>
        </Link>
        <Link to="/claims" className="flex flex-col items-center gap-2 px-3 py-1 flex-1 text-gray-500 hover:text-gray-300">
          <Clock className="w-6 h-6 opacity-80" />
          <span className="text-[9px] font-bold tracking-[0.05em]">HISTORY</span>
        </Link>
        <div className="flex flex-col items-center gap-2 px-3 py-2 flex-1 rounded-2xl bg-[#adc6ff]/10">
          <User className="w-6 h-6 text-[#adc6ff] opacity-90" />
          <span className="text-[9px] font-bold tracking-[0.05em] text-[#adc6ff]">PROFILE</span>
        </div>
      </nav>

    </div>
  );
};

export default WorkerProfile;
