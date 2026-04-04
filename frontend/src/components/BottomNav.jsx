import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, UserCircle } from 'lucide-react';

export const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0E17]/90 backdrop-blur-md border-t border-slate-800/50 pb-safe z-40">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wide">Dashboard</span>
        </NavLink>

        <NavLink 
          to="/payouts" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Receipt className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wide">Payouts</span>
        </NavLink>

        <NavLink 
          to="/profile" 
          className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <UserCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
        </NavLink>
      </div>
    </div>
  );
};
