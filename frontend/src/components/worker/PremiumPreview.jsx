import React from 'react';
import { X, Shield, TrendingUp, Info, CheckCircle } from 'lucide-react';

const DISRUPTION_TYPES = [
  { key: 'rain', label: 'Heavy Rain', icon: '🌧️' },
  { key: 'heat', label: 'Extreme Heat', icon: '🔥' },
  { key: 'aqi', label: 'Severe AQI', icon: '💨' },
  { key: 'flood', label: 'Flood Alert', icon: '🌊' },
  { key: 'curfew', label: 'Curfew', icon: '🚫' },
];

export default function PremiumPreview({ data, weeklyIncome, onActivate, onCancel, loading }) {
  if (!data) return null;

  const {
    premium_amount = 55,
    base_premium = 40,
    income_adjustment_pct = 15,
    seasonal_adjustment_pct = 8,
    zone_risk_factor = 1.2,
    explanation = 'Premium calculated based on your zone risk, declared income, and current seasonal conditions.',
    payout_amount,
  } = data;

  const payout = payout_amount || weeklyIncome || 2000;
  const coverageRatio = ((premium_amount / payout) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 pt-8 pb-6 text-white relative">
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm text-orange-100 font-medium">Weekly Premium</p>
              <p className="text-4xl font-bold">₹{premium_amount.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2 text-sm">
            <TrendingUp className="w-4 h-4 flex-shrink-0" />
            <span>Covers up to <strong>₹{payout.toLocaleString('en-IN')}</strong> per disruption week</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Breakdown */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400" />
              Premium Breakdown
            </h3>
            <div className="bg-gray-50 rounded-2xl divide-y divide-gray-100">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-600">Base zone premium</span>
                <span className="text-sm font-semibold text-gray-800">₹{base_premium}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <div>
                  <span className="text-sm text-gray-600">Income adjustment</span>
                  <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    +{income_adjustment_pct}%
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  +₹{((base_premium * income_adjustment_pct) / 100).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <div>
                  <span className="text-sm text-gray-600">Seasonal adjustment</span>
                  <span className="ml-2 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                    +{seasonal_adjustment_pct}%
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-800">
                  +₹{((base_premium * seasonal_adjustment_pct) / 100).toFixed(0)}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-gray-600">Zone risk factor</span>
                <span className="text-sm font-semibold text-gray-800">×{zone_risk_factor}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-orange-50 rounded-b-2xl">
                <span className="text-sm font-bold text-gray-800">Total weekly premium</span>
                <span className="text-base font-bold text-primary-600">₹{premium_amount}</span>
              </div>
            </div>
          </div>

          {/* Coverage ratio */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              Premium is just <strong>{coverageRatio}%</strong> of your weekly income protection — high value coverage.
            </p>
          </div>

          {/* What's covered */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Covered disruptions</p>
            <div className="flex flex-wrap gap-2">
              {DISRUPTION_TYPES.map((d) => (
                <span
                  key={d.key}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full"
                >
                  <span>{d.icon}</span>
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          {/* ML explanation */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>How this was calculated:</strong> {explanation}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={onActivate}
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Activate Coverage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
