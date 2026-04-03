import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShieldAlert, Map, ListTodo, LineChart, ShieldOff, BrainCircuit, LogOut } from 'lucide-react';
import useAuthStore from '../../../store/useAuthStore';
import { useAdminGuard } from '../../../hooks/useAdminGuard';
import { connectSocket } from '../../../services/socket';

export const AdminLayout = () => {
  // Enforce Guard
  useAdminGuard();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket(user?.id);
    // Bind admin explicitly
    socket.emit('join_admin'); 
    
    setSocketConnected(socket.connected);
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
  }, [user]);

  const onLogout = () => {
    logout();
    navigate('/onboarding');
  };

  const navs = [
    { name: 'Trigger Map', path: '/admin/map', icon: Map },
    { name: 'Claims Queue', path: '/admin/claims', icon: ListTodo },
    { name: 'Analytics', path: '/admin/analytics', icon: LineChart },
    { name: 'Fraud Monitor', path: '/admin/fraud', icon: ShieldOff },
    { name: 'LSTM Forecast', path: '/admin/forecast', icon: BrainCircuit }
  ];

  return (
    <div className="flex h-screen bg-[#0A0E17] text-white overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-60 bg-[#111827] border-r border-slate-800 flex flex-col items-center py-6 fixed h-full shrink-0">
        <div className="flex items-center gap-2 px-6 w-full mb-10">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30 shrink-0">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="font-bold text-xl tracking-tight">GigShield <span className="text-xs text-indigo-400 font-mono align-top block -mt-1">ADMIN</span></span>
        </div>

        <nav className="flex-1 w-full px-4 space-y-1">
          {navs.map((nav) => {
            const Icon = nav.icon;
            return (
              <NavLink
                key={nav.name}
                to={nav.path}
                className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="font-medium text-sm">{nav.name}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="w-full px-4 pt-4 border-t border-slate-800 mt-auto">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/10">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-60 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-slate-800 bg-[#0A0E17]/80 backdrop-blur-md flex items-center justify-end px-8 shrink-0 z-10">
          <div className="flex items-center gap-2 bg-[#111827] px-4 py-1.5 rounded-full border border-slate-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${socketConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${socketConnected ? 'bg-green-500' : 'bg-red-600'}`}></span>
            </span>
            <span className="text-xs font-semibold tracking-wide text-slate-300">
              {socketConnected ? 'Socket Live' : 'Disconnected'}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#0A0E17] p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};
