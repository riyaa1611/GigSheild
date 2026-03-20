import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList, Filter, X, ChevronDown, Search,
  CheckCircle, XCircle, AlertTriangle, Download, RefreshCw
} from 'lucide-react';
import AdminLayout from '../components/Layout/AdminLayout';
import StatusBadge from '../components/shared/StatusBadge';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const TRIGGER_ICONS = {
  rain: '🌧️', heat: '🔥', aqi: '💨', flood: '🌊', curfew: '🚫',
};

const ZONES = ['All Zones', 'Andheri', 'Bandra', 'Dadar', 'Borivali', 'Thane'];
const TRIGGERS = ['All Types', 'rain', 'heat', 'aqi', 'flood', 'curfew'];
const STATUSES = ['All Status', 'pending', 'approved', 'paid', 'flagged', 'rejected'];

const MOCK_CLAIMS = [
  { id: 'CLM-2026-099', worker_name: 'Ravi Kumar', worker_phone: '9876543210', zone: 'Andheri', trigger_type: 'rain', payout_amount: 2500, status: 'flagged', date: '2026-03-17', fraud_flag: true, fraud_reasons: ['Location mismatch'] },
  { id: 'CLM-2026-098', worker_name: 'Priya Singh', worker_phone: '9823456789', zone: 'Bandra', trigger_type: 'heat', payout_amount: 3200, status: 'approved', date: '2026-03-17', fraud_flag: false },
  { id: 'CLM-2026-097', worker_name: 'Amit Sharma', worker_phone: '9812345678', zone: 'Dadar', trigger_type: 'aqi', payout_amount: 2800, status: 'paid', date: '2026-03-16', fraud_flag: false },
  { id: 'CLM-2026-096', worker_name: 'Sunita Yadav', worker_phone: '9856781234', zone: 'Borivali', trigger_type: 'flood', payout_amount: 2200, status: 'flagged', date: '2026-03-16', fraud_flag: true, fraud_reasons: ['Policy activated same day', 'Multiple claims'] },
  { id: 'CLM-2026-095', worker_name: 'Deepak Patel', worker_phone: '9867890123', zone: 'Thane', trigger_type: 'curfew', payout_amount: 2600, status: 'pending', date: '2026-03-15', fraud_flag: false },
  { id: 'CLM-2026-094', worker_name: 'Meena Gupta', worker_phone: '9898765432', zone: 'Andheri', trigger_type: 'rain', payout_amount: 2500, status: 'paid', date: '2026-03-15', fraud_flag: false },
  { id: 'CLM-2026-093', worker_name: 'Suresh Nair', worker_phone: '9945678901', zone: 'Bandra', trigger_type: 'heat', payout_amount: 3000, status: 'approved', date: '2026-03-14', fraud_flag: false },
  { id: 'CLM-2026-092', worker_name: 'Kavita Joshi', worker_phone: '9812890123', zone: 'Dadar', trigger_type: 'aqi', payout_amount: 2700, status: 'rejected', date: '2026-03-13', fraud_flag: true, fraud_reasons: ['Threshold not met'] },
];

function OverrideModal({ claim, onClose, onSubmit, loading }) {
  const [reason, setReason] = useState('');
  const [action, setAction] = useState('approved');

  if (!claim) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Override Claim</h3>
            <p className="text-xs text-gray-500 mt-0.5">{claim.id} — {claim.worker_name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Claim details */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Worker</span>
              <span className="font-semibold text-gray-800">{claim.worker_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payout Amount</span>
              <span className="font-bold text-gray-900">₹{(claim.payout_amount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Current Status</span>
              <StatusBadge status={claim.status} />
            </div>
          </div>

          {/* Fraud reasons if flagged */}
          {claim.fraud_flag && claim.fraud_reasons?.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-red-700 mb-1.5">Fraud Flags</p>
              <div className="space-y-1">
                {claim.fraud_reasons.map((r, i) => (
                  <p key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    {r}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action selection */}
          <div>
            <label className="label">Override Action</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('approved')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  action === 'approved'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => setAction('rejected')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  action === 'rejected'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="label">Reason / Notes</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter override reason..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button
              onClick={() => onSubmit(claim.id, action, reason)}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-50 ${
                action === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : action === 'approved' ? (
                <><CheckCircle className="w-4 h-4" /> Approve Claim</>
              ) : (
                <><XCircle className="w-4 h-4" /> Reject Claim</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState(new Set());

  const [filters, setFilters] = useState({
    zone: 'All Zones',
    trigger: 'All Types',
    status: 'All Status',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.zone !== 'All Zones') params.zone = filters.zone;
      if (filters.trigger !== 'All Types') params.trigger_type = filters.trigger;
      if (filters.status !== 'All Status') params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      const res = await adminAPI.getClaims(params);
      setClaims(res.data.claims || res.data || []);
    } catch {
      setClaims(MOCK_CLAIMS);
    } finally {
      setLoading(false);
    }
  }, [filters.zone, filters.trigger, filters.status, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const filteredClaims = claims.filter((c) => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return (
      c.worker_name?.toLowerCase().includes(s) ||
      c.id?.toLowerCase().includes(s) ||
      c.zone?.toLowerCase().includes(s)
    );
  });

  const handleOverrideSubmit = async (claimId, status, reason) => {
    setOverrideLoading(true);
    try {
      await adminAPI.overrideClaim(claimId, status, reason);
      toast.success(`Claim ${status === 'approved' ? 'approved' : 'rejected'}`);
      setClaims((prev) =>
        prev.map((c) => (c.id === claimId ? { ...c, status } : c))
      );
      setOverrideModal(null);
    } catch {
      toast.error('Override failed. Try again.');
    } finally {
      setOverrideLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAction = (action) => {
    if (selectedClaims.size === 0) return;
    setClaims((prev) =>
      prev.map((c) => selectedClaims.has(c.id) ? { ...c, status: action } : c)
    );
    toast.success(`${selectedClaims.size} claims ${action}`);
    setSelectedClaims(new Set());
  };

  const updateFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));

  const flaggedCount = filteredClaims.filter((c) => c.fraud_flag).length;
  const totalPayout = filteredClaims.reduce((s, c) => s + (c.payout_amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Claims</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredClaims.length} claims · ₹{totalPayout.toLocaleString('en-IN')} total
              {flaggedCount > 0 && (
                <span className="ml-2 text-red-600 font-semibold">{flaggedCount} flagged</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchClaims}
              disabled={loading}
              className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                placeholder="Search worker, claim ID..."
                className="input-field pl-9 py-2.5 text-sm"
              />
            </div>

            <select
              value={filters.zone}
              onChange={(e) => updateFilter('zone', e.target.value)}
              className="input-field py-2.5 text-sm"
            >
              {ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>

            <select
              value={filters.trigger}
              onChange={(e) => updateFilter('trigger', e.target.value)}
              className="input-field py-2.5 text-sm capitalize"
            >
              {TRIGGERS.map((t) => <option key={t} value={t}>{t === 'All Types' ? t : t.toUpperCase()}</option>)}
            </select>

            <select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input-field py-2.5 text-sm"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>

            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="input-field py-2.5 text-sm"
              placeholder="From date"
            />
          </div>
        </div>

        {/* Bulk actions */}
        {selectedClaims.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
            <span className="text-sm font-semibold text-blue-800">{selectedClaims.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleBulkAction('approved')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Bulk Approve
              </button>
              <button
                onClick={() => handleBulkAction('rejected')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Bulk Reject
              </button>
              <button
                onClick={() => setSelectedClaims(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredClaims.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="w-8 h-8 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-500">No claims found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClaims(new Set(filteredClaims.map((c) => c.id)));
                          } else {
                            setSelectedClaims(new Set());
                          }
                        }}
                        checked={selectedClaims.size === filteredClaims.length && filteredClaims.length > 0}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left px-4 py-3">Claim ID</th>
                    <th className="text-left px-4 py-3">Worker</th>
                    <th className="text-left px-4 py-3">Zone</th>
                    <th className="text-left px-4 py-3">Trigger</th>
                    <th className="text-right px-4 py-3">Payout</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Flag</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className={`hover:bg-gray-50/80 transition-colors ${claim.fraud_flag ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedClaims.has(claim.id)}
                          onChange={() => toggleSelect(claim.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-500">{claim.id}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-gray-800 whitespace-nowrap">{claim.worker_name}</p>
                          {claim.worker_phone && (
                            <p className="text-xs text-gray-400">{claim.worker_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-gray-700">{claim.zone}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span>{TRIGGER_ICONS[claim.trigger_type?.toLowerCase()] || '📋'}</span>
                          <span className="capitalize text-gray-700">{claim.trigger_type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-bold text-gray-900">
                          ₹{(claim.payout_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(claim.date || claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={claim.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {claim.fraud_flag ? (
                          <div className="group relative inline-flex">
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full cursor-help">
                              <AlertTriangle className="w-3 h-3" />
                              Flagged
                            </span>
                            {claim.fraud_reasons?.length > 0 && (
                              <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 z-10 bg-gray-900 text-white text-xs rounded-xl px-3 py-2 min-w-max shadow-xl">
                                {claim.fraud_reasons.map((r, i) => <div key={i}>• {r}</div>)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {(claim.status === 'flagged' || claim.status === 'pending') && (
                          <button
                            onClick={() => setOverrideModal(claim)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                          >
                            Override
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {overrideModal && (
        <OverrideModal
          claim={overrideModal}
          onClose={() => setOverrideModal(null)}
          onSubmit={handleOverrideSubmit}
          loading={overrideLoading}
        />
      )}
    </AdminLayout>
  );
}
