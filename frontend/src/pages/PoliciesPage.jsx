import React, { useEffect, useState } from 'react';
import {
  Shield, Plus, CheckCircle, XCircle, Clock, CloudRain,
  Flame, Wind, Waves, ShieldOff, ChevronRight, AlertTriangle, Info
} from 'lucide-react';
import WorkerLayout from '../components/Layout/WorkerLayout';
import StatusBadge from '../components/shared/StatusBadge';
import PremiumPreview from '../components/worker/PremiumPreview';
import { policyAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DISRUPTION_TAGS = [
  { key: 'rain', label: 'Heavy Rain', icon: CloudRain, color: 'bg-blue-100 text-blue-700' },
  { key: 'heat', label: 'Extreme Heat', icon: Flame, color: 'bg-orange-100 text-orange-700' },
  { key: 'aqi', label: 'Severe AQI', icon: Wind, color: 'bg-purple-100 text-purple-700' },
  { key: 'flood', label: 'Flood Alert', icon: Waves, color: 'bg-cyan-100 text-cyan-700' },
  { key: 'curfew', label: 'Curfew', icon: ShieldOff, color: 'bg-red-100 text-red-700' },
];

function CoverageTag({ tag }) {
  const Icon = tag.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${tag.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {tag.label}
    </span>
  );
}

function ActivePolicyCard({ policy, onDeactivate, deactivating }) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-sm">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="font-bold text-emerald-900 text-base">Income Shield — Active</p>
            <p className="text-xs text-emerald-600 mt-0.5">Parametric income protection</p>
          </div>
        </div>
        <StatusBadge status="active" />
      </div>

      {/* Coverage period */}
      <div className="bg-white/60 rounded-xl px-4 py-3 mb-3">
        <p className="text-xs text-gray-500 font-medium mb-0.5">Coverage Period</p>
        <p className="text-sm font-bold text-gray-800">
          {policy.coverage_period || 'Current week (Mon–Sun)'}
        </p>
      </div>

      {/* Amounts row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/60 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 font-medium mb-0.5">Weekly Payout</p>
          <p className="text-xl font-bold text-emerald-700">
            ₹{(policy.payout_amount || policy.weekly_income || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white/60 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-500 font-medium mb-0.5">Weekly Premium</p>
          <p className="text-xl font-bold text-gray-800">
            ₹{(policy.premium_amount || 0).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Disruption types */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 font-semibold mb-2">Covered Disruptions</p>
        <div className="flex flex-wrap gap-2">
          {DISRUPTION_TAGS.map((tag) => (
            <CoverageTag key={tag.key} tag={tag} />
          ))}
        </div>
      </div>

      {/* Zone */}
      {policy.zone && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Info className="w-3.5 h-3.5" />
          Zone: <span className="font-semibold capitalize">{policy.zone}</span>
        </div>
      )}

      <button
        onClick={onDeactivate}
        disabled={deactivating}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold disabled:opacity-50"
      >
        {deactivating ? (
          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        Deactivate Policy
      </button>
    </div>
  );
}

function NoPolicyCard({ onActivate, loading }) {
  return (
    <div className="card border-2 border-dashed border-gray-200 text-center py-10">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Shield className="w-9 h-9 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">No Active Policy</h3>
      <p className="text-sm text-gray-400 mb-5 max-w-xs mx-auto leading-relaxed">
        Activate weekly income protection. Payouts are automatic — no paperwork, no waiting.
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {DISRUPTION_TAGS.map((tag) => (
          <CoverageTag key={tag.key} tag={tag} />
        ))}
      </div>
      <button
        onClick={onActivate}
        disabled={loading}
        className="btn-primary inline-flex items-center gap-2 mx-auto"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        Get Premium Quote
      </button>
    </div>
  );
}

export default function PoliciesPage() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const activePolicy = policies.find((p) => p.status === 'active');
  const historyPolicies = policies.filter((p) => p.status !== 'active');

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await policyAPI.list();
      setPolicies(res.data.policies || res.data || []);
    } catch {
      // Mock data
      setPolicies([
        {
          id: 'POL-001',
          status: 'active',
          payout_amount: 2500,
          premium_amount: 63,
          zone: user?.zone || 'andheri',
          coverage_period: 'Mon 17 Mar – Sun 23 Mar 2026',
          created_at: '2026-03-17',
        },
        {
          id: 'POL-000',
          status: 'inactive',
          payout_amount: 2500,
          premium_amount: 60,
          zone: user?.zone || 'andheri',
          coverage_period: 'Mon 10 Mar – Sun 16 Mar 2026',
          created_at: '2026-03-10',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    // eslint-disable-next-line
  }, []);

  const handleGetQuote = async () => {
    setPreviewLoading(true);
    try {
      const res = await policyAPI.previewPremium({
        zone: user?.zone,
        weekly_income: user?.weekly_income,
      });
      setPreviewData(res.data);
    } catch {
      // Mock premium preview
      setPreviewData({
        premium_amount: 63,
        base_premium: 45,
        income_adjustment_pct: 12,
        seasonal_adjustment_pct: 6,
        zone_risk_factor: 1.1,
        payout_amount: user?.weekly_income || 2500,
        explanation:
          'Your premium is calculated based on your zone\'s historical weather disruption frequency, your declared weekly income, and the current monsoon season risk factor for Mumbai.',
      });
    } finally {
      setPreviewLoading(false);
      setShowPreview(true);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await policyAPI.create({
        zone: user?.zone,
        weekly_income: user?.weekly_income,
        premium_amount: previewData?.premium_amount,
      });
      toast.success('Policy activated! You\'re now protected this week.');
      setShowPreview(false);
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to activate policy. Please try again.');
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your policy? You won\'t be covered for disruptions this week.')) return;
    setDeactivating(true);
    try {
      await policyAPI.deactivate(activePolicy.id);
      toast.success('Policy deactivated.');
      fetchPolicies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate policy.');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <WorkerLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Policy</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your income protection coverage</p>
          </div>
          {!activePolicy && !loading && (
            <button
              onClick={handleGetQuote}
              disabled={previewLoading}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {previewLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Activate Coverage</span>
              <span className="sm:hidden">Activate</span>
            </button>
          )}
        </div>

        {/* How it works banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">How income protection works</p>
            <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
              When a disruption (rain, heat, AQI, flood, or curfew) hits your zone and exceeds the threshold,
              you automatically receive a payout equal to your declared weekly income. No filing needed.
            </p>
          </div>
        </div>

        {/* Current policy / no policy */}
        {loading ? (
          <div className="card animate-pulse">
            <div className="h-6 bg-gray-100 rounded w-1/3 mb-4" />
            <div className="h-20 bg-gray-100 rounded-xl mb-3" />
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
        ) : activePolicy ? (
          <ActivePolicyCard
            policy={activePolicy}
            onDeactivate={handleDeactivate}
            deactivating={deactivating}
          />
        ) : (
          <NoPolicyCard onActivate={handleGetQuote} loading={previewLoading} />
        )}

        {/* Policy History */}
        {historyPolicies.length > 0 && (
          <div className="card">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Policy History
            </h2>
            <div className="space-y-2">
              {historyPolicies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="w-9 h-9 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-700">
                      {policy.coverage_period || new Date(policy.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-400">
                      ₹{(policy.payout_amount || 0).toLocaleString('en-IN')} coverage · ₹{(policy.premium_amount || 0)} premium
                    </p>
                  </div>
                  <StatusBadge status={policy.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notice */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            This is <strong>income protection only</strong>. GigShield does not cover health, vehicle, or accident expenses.
            Coverage is weekly and resets every Monday.
          </p>
        </div>
      </div>

      {/* Premium preview modal */}
      {showPreview && (
        <PremiumPreview
          data={previewData}
          weeklyIncome={user?.weekly_income}
          onActivate={handleActivate}
          onCancel={() => setShowPreview(false)}
          loading={activating}
        />
      )}
    </WorkerLayout>
  );
}

