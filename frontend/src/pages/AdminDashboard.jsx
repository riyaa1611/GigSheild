import React, { useEffect, useState } from 'react';
import {
  Shield, Users, IndianRupee, TrendingDown, AlertTriangle,
  CheckCircle, XCircle, RefreshCw, Activity, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import AdminLayout from '../components/Layout/AdminLayout';
import StatusBadge from '../components/shared/StatusBadge';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const ZONE_COLORS = ['#f97316', '#1e40af', '#16a34a', '#8b5cf6', '#06b6d4'];

const MOCK_DATA = {
  stats: {
    active_policies: 1247,
    total_payouts_week: 318500,
    loss_ratio: 68.4,
    flagged_claims: 12,
  },
  zone_payouts: [
    { zone: 'Andheri', payouts: 87500 },
    { zone: 'Bandra', payouts: 65000 },
    { zone: 'Dadar', payouts: 72000 },
    { zone: 'Borivali', payouts: 58000 },
    { zone: 'Thane', payouts: 36000 },
  ],
  trigger_breakdown: [
    { name: 'Heavy Rain', value: 42 },
    { name: 'Extreme Heat', value: 23 },
    { name: 'Severe AQI', value: 18 },
    { name: 'Flood', value: 11 },
    { name: 'Curfew', value: 6 },
  ],
  zones: [
    { name: 'Andheri', risk: 'high', active_policies: 387, total_payouts: 87500, disruption_active: true, disruption_type: 'rain' },
    { name: 'Bandra', risk: 'medium', active_policies: 293, total_payouts: 65000, disruption_active: false },
    { name: 'Dadar', risk: 'high', active_policies: 274, total_payouts: 72000, disruption_active: true, disruption_type: 'heat' },
    { name: 'Borivali', risk: 'low', active_policies: 198, total_payouts: 58000, disruption_active: false },
    { name: 'Thane', risk: 'medium', active_policies: 95, total_payouts: 36000, disruption_active: false },
  ],
  flagged_claims: [
    { id: 'CLM-2026-099', worker_name: 'Ravi Kumar', amount: 2500, zone: 'Andheri', fraud_reasons: ['Location mismatch', 'Multiple claims same day'], status: 'flagged' },
    { id: 'CLM-2026-087', worker_name: 'Amit Sharma', amount: 3200, zone: 'Dadar', fraud_reasons: ['Policy activated same day as claim'], status: 'flagged' },
    { id: 'CLM-2026-076', worker_name: 'Priya Singh', amount: 2800, zone: 'Bandra', fraud_reasons: ['Threshold barely met'], status: 'flagged' },
  ],
  recent_activity: [
    { type: 'claim', text: 'Auto-claim generated for 43 workers in Andheri (Heavy Rain)', time: '12 min ago', color: 'blue' },
    { type: 'payout', text: 'Batch payout of ₹1,07,500 sent to 43 workers', time: '8 min ago', color: 'green' },
    { type: 'trigger', text: 'IMD rain threshold exceeded in Andheri zone', time: '25 min ago', color: 'orange' },
    { type: 'flag', text: 'Fraud detection flagged 3 claims for manual review', time: '1 hr ago', color: 'red' },
    { type: 'policy', text: '12 new policies activated this morning', time: '2 hr ago', color: 'purple' },
  ],
};

const RISK_BADGE = {
  high: 'bg-red-100 text-red-700 border border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  low: 'bg-green-100 text-green-700 border border-green-200',
};

const ACTIVITY_COLORS = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

function StatCard({ icon: Icon, label, value, sub, color, highlight }) {
  const bgColor = {
    blue: 'from-blue-500 to-blue-700',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  }[color] || 'from-gray-400 to-gray-600';

  return (
    <div className={`card ${highlight ? 'ring-2 ring-red-300 ring-offset-1' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${bgColor} flex items-center justify-center shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {highlight && (
          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
            ACTION
          </span>
        )}
      </div>
      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-semibold text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-sm text-primary-600 font-bold">₹{payload[0].value.toLocaleString('en-IN')}</p>
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overriding, setOverriding] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getDashboard();
      setData(res.data);
    } catch {
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOverride = async (claimId, status) => {
    setOverriding((prev) => ({ ...prev, [claimId]: true }));
    try {
      await adminAPI.overrideClaim(claimId, status);
      toast.success(`Claim ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      // Update local state
      setData((prev) => ({
        ...prev,
        flagged_claims: prev.flagged_claims.filter((c) => c.id !== claimId),
        stats: {
          ...prev.stats,
          flagged_claims: Math.max(0, (prev.stats.flagged_claims || 0) - 1),
        },
      }));
    } catch {
      toast.error('Override failed. Please try again.');
    } finally {
      setOverriding((prev) => ({ ...prev, [claimId]: false }));
    }
  };

  const stats = data?.stats || {};
  const zonePayouts = data?.zone_payouts || [];
  const triggerBreakdown = data?.trigger_breakdown || [];
  const zones = data?.zones || [];
  const flaggedClaims = data?.flagged_claims || [];
  const recentActivity = data?.recent_activity || [];

  const lossRatioHigh = (stats.loss_ratio || 0) > 70;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-32" />
            ))
          ) : (
            <>
              <StatCard
                icon={Shield}
                label="Active Policies"
                value={stats.active_policies?.toLocaleString('en-IN') || '0'}
                sub="This week"
                color="blue"
              />
              <StatCard
                icon={IndianRupee}
                label="Payouts This Week"
                value={`₹${((stats.total_payouts_week || 0) / 1000).toFixed(0)}K`}
                sub={`₹${(stats.total_payouts_week || 0).toLocaleString('en-IN')} total`}
                color="green"
              />
              <StatCard
                icon={TrendingDown}
                label="Loss Ratio"
                value={`${stats.loss_ratio || 0}%`}
                sub={lossRatioHigh ? 'Above threshold' : 'Within target'}
                color={lossRatioHigh ? 'red' : 'orange'}
                highlight={lossRatioHigh}
              />
              <StatCard
                icon={AlertTriangle}
                label="Flagged Claims"
                value={stats.flagged_claims || 0}
                sub="Needs review"
                color="red"
                highlight={stats.flagged_claims > 0}
              />
            </>
          )}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="card lg:col-span-2">
            <h2 className="font-bold text-gray-900 mb-4">Zone-wise Weekly Payouts</h2>
            {loading ? (
              <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={zonePayouts} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="zone" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="payouts" fill="#f97316" radius={[8, 8, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4">Claims by Trigger</h2>
            {loading ? (
              <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={triggerBreakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {triggerBreakdown.map((_, i) => (
                      <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, 'Share']} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Zones table */}
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Zone Status</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left pb-3 pr-4">Zone</th>
                    <th className="text-left pb-3 pr-4">Risk</th>
                    <th className="text-right pb-3 pr-4">Policies</th>
                    <th className="text-right pb-3 pr-4">Payouts</th>
                    <th className="text-left pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {zones.map((zone) => (
                    <tr key={zone.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4 font-semibold text-gray-800">{zone.name}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${RISK_BADGE[zone.risk] || ''}`}>
                          {zone.risk}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-gray-700">{zone.active_policies}</td>
                      <td className="py-3 pr-4 text-right font-medium text-gray-700">
                        ₹{(zone.total_payouts || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3">
                        {zone.disruption_active ? (
                          <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            {zone.disruption_type || 'Disrupted'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Flagged claims */}
        {(flaggedClaims.length > 0 || loading) && (
          <div className="card ring-1 ring-red-100">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="font-bold text-gray-900">Flagged Claims — Action Required</h2>
              {flaggedClaims.length > 0 && (
                <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                  {flaggedClaims.length} pending
                </span>
              )}
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {flaggedClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">{claim.worker_name}</span>
                        <span className="text-xs text-gray-400 font-mono">{claim.id}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{claim.zone}</span>
                      </div>
                      <p className="text-base font-bold text-red-700 mt-1">₹{(claim.amount || 0).toLocaleString('en-IN')}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(claim.fraud_reasons || []).map((reason, idx) => (
                          <span key={idx} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleOverride(claim.id, 'rejected')}
                        disabled={overriding[claim.id]}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleOverride(claim.id, 'approved')}
                        disabled={overriding[claim.id]}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {overriding[claim.id] ? (
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-gray-900">Recent Activity</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${ACTIVITY_COLORS[item.color] || 'bg-gray-100 text-gray-500'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
