import React, { useEffect, useState } from 'react';
import {
  ClipboardList, Filter, X, ChevronDown, ExternalLink,
  CloudRain, Flame, Wind, Waves, ShieldOff, Clock, IndianRupee
} from 'lucide-react';
import WorkerLayout from '../components/Layout/WorkerLayout';
import StatusBadge from '../components/shared/StatusBadge';
import { claimsAPI } from '../services/api';

const TRIGGER_META = {
  rain:   { icon: '🌧️', label: 'Heavy Rain',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  heat:   { icon: '🔥', label: 'Extreme Heat',   color: 'bg-orange-50 text-orange-700 border-orange-200' },
  aqi:    { icon: '💨', label: 'Severe AQI',     color: 'bg-purple-50 text-purple-700 border-purple-200' },
  flood:  { icon: '🌊', label: 'Flood Alert',    color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  curfew: { icon: '🚫', label: 'Curfew/Lockdown', color: 'bg-red-50 text-red-700 border-red-200' },
};

const STATUS_FILTERS = ['all', 'approved', 'paid', 'pending', 'flagged'];

function TriggerChip({ type }) {
  const meta = TRIGGER_META[type?.toLowerCase()] || { icon: '📋', label: type || 'Unknown', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${meta.color}`}>
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function ClaimDetailModal({ claim, onClose }) {
  if (!claim) return null;
  const meta = TRIGGER_META[claim.trigger_type?.toLowerCase()] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{meta.icon || '📋'}</span>
            <div>
              <h3 className="font-bold text-gray-900">{meta.label || claim.trigger_type}</h3>
              <p className="text-xs text-gray-500">Claim #{claim.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 font-medium">Payout Amount</p>
              <p className="text-xl font-bold text-gray-900">₹{(claim.payout_amount || 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 font-medium">Status</p>
              <div className="mt-1"><StatusBadge status={claim.status} /></div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: 'Claim Date', value: claim.date || claim.created_at ? new Date(claim.date || claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Hours of Disruption', value: claim.hours_lost ? `${claim.hours_lost} hours` : '—' },
              { label: 'Zone', value: claim.zone || '—' },
              { label: 'Trigger Type', value: meta.label || claim.trigger_type || '—' },
              { label: 'Policy ID', value: claim.policy_id || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm py-2 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold text-gray-800 capitalize">{value}</span>
              </div>
            ))}
          </div>

          {claim.status === 'flagged' && claim.fraud_reason && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Flag Reason</p>
              <p className="text-sm text-red-600">{claim.fraud_reason}</p>
            </div>
          )}

          {claim.status === 'paid' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-700">
                <span className="font-semibold">₹{(claim.payout_amount || 0).toLocaleString('en-IN')}</span> paid to your UPI ID
                {claim.paid_at && ` on ${new Date(claim.paid_at).toLocaleDateString('en-IN')}`}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState(null);

  useEffect(() => {
    const fetchClaims = async () => {
      setLoading(true);
      try {
        const res = await claimsAPI.list();
        setClaims(res.data.claims || res.data || []);
      } catch {
        // Mock data
        setClaims([
          { id: 'CLM-2026-007', trigger_type: 'rain', date: '2026-03-17', hours_lost: 6, payout_amount: 2500, status: 'paid', zone: 'Andheri', paid_at: '2026-03-18' },
          { id: 'CLM-2026-006', trigger_type: 'heat', date: '2026-03-10', hours_lost: 4, payout_amount: 2500, status: 'approved', zone: 'Andheri' },
          { id: 'CLM-2026-005', trigger_type: 'aqi', date: '2026-02-28', hours_lost: 8, payout_amount: 2500, status: 'paid', zone: 'Andheri', paid_at: '2026-03-01' },
          { id: 'CLM-2026-004', trigger_type: 'flood', date: '2026-02-15', hours_lost: 12, payout_amount: 2500, status: 'flagged', zone: 'Andheri', fraud_reason: 'Location data inconsistency detected during flood event.' },
          { id: 'CLM-2026-003', trigger_type: 'curfew', date: '2026-02-01', hours_lost: 10, payout_amount: 2500, status: 'paid', zone: 'Andheri', paid_at: '2026-02-02' },
          { id: 'CLM-2026-002', trigger_type: 'rain', date: '2026-01-20', hours_lost: 5, payout_amount: 2200, status: 'paid', zone: 'Andheri', paid_at: '2026-01-21' },
          { id: 'CLM-2026-001', trigger_type: 'heat', date: '2026-01-08', hours_lost: 3, payout_amount: 2200, status: 'paid', zone: 'Andheri', paid_at: '2026-01-09' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  const filtered = claims.filter(
    (c) => statusFilter === 'all' || c.status === statusFilter
  );

  const totalPaid = claims
    .filter((c) => c.status === 'paid')
    .reduce((sum, c) => sum + (c.payout_amount || 0), 0);

  return (
    <WorkerLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Claims</h1>
          <p className="text-sm text-gray-500 mt-0.5">Auto-generated claims from disruption events in your zone</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-gray-900">{claims.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Claims</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-2xl font-bold text-emerald-600">
              {claims.filter((c) => c.status === 'paid').length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Paid Out</p>
          </div>
          <div className="card text-center py-4">
            <p className="text-lg font-bold text-gray-900">
              ₹{totalPaid.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Total Received</p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                statusFilter === f
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({claims.filter((c) => c.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Claims list */}
        <div className="card">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-500">No {statusFilter !== 'all' ? statusFilter : ''} claims found</p>
              <p className="text-xs text-gray-400 mt-1">
                {statusFilter === 'all'
                  ? 'Claims are created automatically when disruptions hit your zone'
                  : `No claims with status "${statusFilter}"`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table header — desktop */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                <div className="col-span-2">Claim ID</div>
                <div className="col-span-3">Type</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Hours</div>
                <div className="col-span-2">Payout</div>
                <div className="col-span-1">Status</div>
              </div>

              {filtered.map((claim) => (
                <button
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className="w-full flex md:grid md:grid-cols-12 gap-2 items-center px-3 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                >
                  {/* Mobile layout */}
                  <div className="flex items-center gap-3 flex-1 md:col-span-2">
                    <span className="text-2xl md:hidden">
                      {TRIGGER_META[claim.trigger_type?.toLowerCase()]?.icon || '📋'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-500 truncate">{claim.id}</p>
                      <div className="md:hidden mt-0.5">
                        <p className="text-sm font-semibold text-gray-800">
                          {TRIGGER_META[claim.trigger_type?.toLowerCase()]?.label || claim.trigger_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(claim.date || claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:block md:col-span-3">
                    <TriggerChip type={claim.trigger_type} />
                  </div>

                  <div className="hidden md:block md:col-span-2 text-sm text-gray-600">
                    {new Date(claim.date || claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>

                  <div className="hidden md:block md:col-span-2 text-sm text-gray-600">
                    {claim.hours_lost ? `${claim.hours_lost}h` : '—'}
                  </div>

                  <div className="md:col-span-2 text-right md:text-left">
                    <p className="text-sm font-bold text-gray-900">₹{(claim.payout_amount || 0).toLocaleString('en-IN')}</p>
                    <div className="md:hidden mt-0.5"><StatusBadge status={claim.status} /></div>
                  </div>

                  <div className="hidden md:block md:col-span-1">
                    <StatusBadge status={claim.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </WorkerLayout>
  );
}
