import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, TrendingUp, IndianRupee, FileText, ChevronRight,
  RefreshCw, AlertTriangle, Clock, Zap
} from 'lucide-react';
import WorkerLayout from '../components/Layout/WorkerLayout';
import DisruptionBanner from '../components/shared/DisruptionBanner';
import StatusBadge from '../components/shared/StatusBadge';
import { workerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TRIGGER_ICONS = {
  rain: '🌧️', heat: '🔥', aqi: '💨', flood: '🌊', curfew: '🚫',
};

function StatCard({ icon: Icon, label, value, sub, color = 'blue', loading }) {
  const colorMap = {
    orange: 'from-orange-500 to-orange-600',
    green: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-700',
    purple: 'from-purple-500 to-purple-700',
  };
  const bgMap = {
    orange: 'bg-orange-50',
    green: 'bg-emerald-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
  };
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-sm flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="h-7 w-20 bg-gray-100 rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
        <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function PolicyStatusCard({ policy, loading }) {
  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-8 bg-gray-100 rounded w-1/2 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="card border-dashed border-2 border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Shield className="w-7 h-7 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-600">No Active Policy</p>
            <p className="text-sm text-gray-400 mt-0.5">Activate coverage to protect your income</p>
            <Link
              to="/policies"
              className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Activate now <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-base">Income Protected</p>
            <p className="text-xs text-emerald-100">Policy active this week</p>
          </div>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">ACTIVE</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-white/10 rounded-xl px-3 py-2.5">
          <p className="text-xs text-emerald-100">Weekly Coverage</p>
          <p className="text-xl font-bold">₹{(policy.payout_amount || policy.weekly_income || 0).toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white/10 rounded-xl px-3 py-2.5">
          <p className="text-xs text-emerald-100">Weekly Premium</p>
          <p className="text-xl font-bold">₹{(policy.premium_amount || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>
    </div>
  );
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'Partner';

  const fetchDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await workerAPI.getDashboard();
      setData(res.data);
    } catch {
      // Use mock data if API not available
      setData({
        policy: {
          status: 'active',
          payout_amount: 2500,
          premium_amount: 63,
          zone: user?.zone || 'andheri',
          coverage_period: 'Mon 17 Mar – Sun 23 Mar',
        },
        disruptions: [],
        stats: {
          claims_this_month: 2,
          total_payouts: 5000,
          coverage_status: 'Active',
        },
        recent_claims: [
          { id: 'CLM-001', trigger_type: 'rain', date: '2026-03-15', payout_amount: 2500, status: 'paid' },
          { id: 'CLM-002', trigger_type: 'heat', date: '2026-03-08', payout_amount: 2500, status: 'approved' },
        ],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line
  }, []);

  const policy = data?.policy;
  const disruptions = data?.disruptions || [];
  const stats = data?.stats || {};
  const recentClaims = data?.recent_claims || [];
  const zoneName = policy?.zone_name || policy?.zone || user?.zone || 'your zone';

  return (
    <WorkerLayout>
      <div className="space-y-5">
        {/* Greeting row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              नमस्ते, {firstName}! 🛵
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Policy status card */}
        <PolicyStatusCard policy={policy} loading={loading} />

        {/* Disruption banner */}
        <DisruptionBanner disruptions={disruptions} zoneName={zoneName} />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={FileText}
            label="Claims This Month"
            value={loading ? '—' : stats.claims_this_month ?? 0}
            color="blue"
            loading={loading}
          />
          <StatCard
            icon={IndianRupee}
            label="Total Payouts"
            value={loading ? '—' : `₹${(stats.total_payouts || 0).toLocaleString('en-IN')}`}
            sub="All time received"
            color="green"
            loading={loading}
          />
          <StatCard
            icon={Zap}
            label="Zone Status"
            value={loading ? '—' : disruptions.length > 0 ? 'Disrupted' : 'Clear'}
            sub={zoneName}
            color={disruptions.length > 0 ? 'orange' : 'purple'}
            loading={loading}
          />
          <StatCard
            icon={Shield}
            label="Coverage"
            value={loading ? '—' : policy ? 'Active' : 'Inactive'}
            sub={policy ? 'This week' : 'Not covered'}
            color={policy ? 'green' : 'blue'}
            loading={loading}
          />
        </div>

        {/* Recent Claims */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Recent Claims
            </h2>
            <Link
              to="/claims"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentClaims.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No claims yet</p>
              <p className="text-xs text-gray-400 mt-1">Claims are auto-generated when disruptions occur in your zone</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentClaims.slice(0, 5).map((claim) => (
                <Link
                  key={claim.id}
                  to="/claims"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg group-hover:bg-gray-200 transition-colors">
                    {TRIGGER_ICONS[claim.trigger_type?.toLowerCase()] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 capitalize">{claim.trigger_type?.replace('_', ' ')} disruption</p>
                    <p className="text-xs text-gray-400">
                      {new Date(claim.date || claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">₹{(claim.payout_amount || 0).toLocaleString('en-IN')}</p>
                    <StatusBadge status={claim.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/policies"
            className="card flex flex-col items-center gap-2 py-5 hover:border-primary-200 hover:shadow-md hover:shadow-orange-50 transition-all group text-center"
          >
            <div className="w-12 h-12 bg-orange-50 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center transition-colors">
              <Shield className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Manage Policy</p>
            <p className="text-xs text-gray-400">Activate or view coverage</p>
          </Link>
          <Link
            to="/claims"
            className="card flex flex-col items-center gap-2 py-5 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all group text-center"
          >
            <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center transition-colors">
              <TrendingUp className="w-6 h-6 text-shield-blue" />
            </div>
            <p className="text-sm font-semibold text-gray-700">All Claims</p>
            <p className="text-xs text-gray-400">View your claim history</p>
          </Link>
        </div>

        {/* Info footer */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            GigShield provides <strong>income protection only</strong>. Payouts are triggered automatically when parametric thresholds (rain, heat, AQI, flood, curfew) are met in your zone. No claim filing needed.
          </p>
        </div>
      </div>
    </WorkerLayout>
  );
}
