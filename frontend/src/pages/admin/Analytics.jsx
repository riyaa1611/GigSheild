import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { getAdminAnalytics, getAdminAnalyticsTriggers, getAdminAnalyticsClaims, getAdminAnalyticsPlans } from '../../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#6366f1', '#f59e0b']; // emerald, indigo, amber

export const Analytics = () => {
  const [metrics, setMetrics] = useState({});
  const [triggers, setTriggers] = useState([]);
  const [claimsData, setClaimsData] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, tRes, cRes, pRes] = await Promise.all([
          getAdminAnalytics(),
          getAdminAnalyticsTriggers(),
          getAdminAnalyticsClaims(),
          getAdminAnalyticsPlans()
        ]);
        setMetrics(mRes.data);
        setTriggers(tRes.data.data);
        setClaimsData(cRes.data.data);
        setPlans(pRes.data.data);
      } catch (e) {
        toast.error('Failed to load analytics');
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-10 text-slate-400">Loading metrics...</div>;

  const MetricCard = ({ title, value, unit='' }) => (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg">
      <p className="text-slate-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{unit}{value}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Analytics</h1>
      
      {/* Metrics Row */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard title="Active Policies" value={metrics.totalActiveUsers} />
        <MetricCard title="Claims This Week" value={metrics.claimsThisWeek} />
        <MetricCard title="Total Paid Out" value={metrics.totalPaidOut?.toLocaleString('en-IN')} unit="₹" />
        <MetricCard title="Loss Ratio" value={metrics.lossRatio} unit="%" />
        <MetricCard title="Avg Payout Time" value={parseInt(metrics.avgPayoutTime || 0)} unit="m " />
      </div>

      {/* Chart Row 1: Claims vs Premiums */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-6">Financial Trajectory (30 Days)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={claimsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{fontSize: 12}} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{fontSize: 12}} tickFormatter={(val)=>`₹${val/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="claimsAmount" name="Claims Paid" stroke="#f43f5e" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="premiumsCollected" name="Premiums Collected" stroke="#0ea5e9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Trigger Freq */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6">Trigger Frequencies</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={triggers} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="type" type="category" stroke="#64748b" width={50} />
                <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Dist */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-6">Plan Distribution</h3>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={plans} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count" nameKey="plan">
                  {plans.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
             {plans.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                  <span className="text-sm text-slate-300 capitalize">{p.plan} ({p.percentage}%)</span>
                </div>
             ))}
          </div>
        </div>
      </div>

    </div>
  );
};
