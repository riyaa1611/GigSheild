import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, User, Phone, Mail, Lock, MapPin, Truck,
  CreditCard, Eye, EyeOff, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MUMBAI_ZONES = [
  { value: 'bandra', label: 'Bandra & Khar' },
  { value: 'andheri', label: 'Andheri & Jogeshwari' },
  { value: 'dadar', label: 'Dadar & Matunga' },
  { value: 'borivali', label: 'Borivali & Kandivali' },
  { value: 'thane', label: 'Thane & Mulund' },
];

const PLATFORMS = [
  { value: 'zomato', label: 'Zomato', emoji: '🔴' },
  { value: 'swiggy', label: 'Swiggy', emoji: '🟠' },
  { value: 'both', label: 'Both', emoji: '🍽️' },
];

const STEPS = ['Personal', 'Location', 'Income'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, idx) => {
        const done = idx < current;
        const active = idx === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : active
                    ? 'bg-primary-500 text-white shadow-md shadow-orange-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? '✓' : idx + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  active ? 'text-primary-600' : done ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mb-5 rounded-full max-w-16 transition-all ${
                  done ? 'bg-emerald-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    city: 'Mumbai', zone: '', platform: '',
    weekly_income: '', aadhaar_mock: '', upi_id: '',
  });

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validateStep = () => {
    if (step === 0) {
      if (!form.name || !form.phone || !form.email || !form.password)
        return 'Please fill in all fields.';
      if (form.phone.length < 10)
        return 'Enter a valid 10-digit phone number.';
      if (form.password.length < 6)
        return 'Password must be at least 6 characters.';
    }
    if (step === 1) {
      if (!form.zone || !form.platform)
        return 'Please select your zone and delivery platform.';
    }
    if (step === 2) {
      if (!form.weekly_income || !form.upi_id)
        return 'Please fill in weekly income and UPI ID.';
      if (Number(form.weekly_income) < 1000)
        return 'Weekly income must be at least ₹1,000.';
    }
    return null;
  };

  const handleNext = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      await register({
        name: form.name,
        phone: form.phone,
        email: form.email,
        password: form.password,
        city: form.city,
        zone: form.zone,
        platform: form.platform,
        weekly_income: Number(form.weekly_income),
        aadhaar_mock: form.aadhaar_mock,
        upi_id: form.upi_id,
      });
      navigate('/dashboard');
    } catch (err2) {
      const msg = err2.response?.data?.message || err2.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-md shadow-orange-200">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">GigShield</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Income protection for delivery heroes</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-7">
          <StepIndicator current={step} />

          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
            {/* Step 0: Personal */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
                  <p className="text-sm text-gray-500 mt-1">Tell us about yourself</p>
                </div>
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder="Rahul Sharma"
                      className="input-field pl-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="input-field pl-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="rahul@example.com"
                      className="input-field pl-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="Min. 6 characters"
                      className="input-field pl-11 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Location */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Your Location</h2>
                  <p className="text-sm text-gray-500 mt-1">We use this to calculate your zone risk</p>
                </div>
                <div>
                  <label className="label">City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value="Mumbai"
                      readOnly
                      className="input-field pl-11 bg-gray-50 cursor-not-allowed text-gray-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Currently available in Mumbai only</p>
                </div>
                <div>
                  <label className="label">Your Zone</label>
                  <select
                    value={form.zone}
                    onChange={(e) => update('zone', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select your delivery zone</option>
                    {MUMBAI_ZONES.map((z) => (
                      <option key={z.value} value={z.value}>{z.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Delivery Platform</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => update('platform', p.value)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all text-sm font-semibold ${
                          form.platform === p.value
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <span className="text-2xl">{p.emoji}</span>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Your zone determines your risk profile. Higher-risk zones may have slightly different premium calculations.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Income */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Income Details</h2>
                  <p className="text-sm text-gray-500 mt-1">Used to calculate your coverage amount</p>
                </div>
                <div>
                  <label className="label">Weekly Income (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">₹</span>
                    <input
                      type="number"
                      value={form.weekly_income}
                      onChange={(e) => update('weekly_income', e.target.value)}
                      placeholder="2500"
                      min="1000"
                      max="15000"
                      className="input-field pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Your declared average weekly income from deliveries</p>
                </div>
                <div>
                  <label className="label">Aadhaar Number (Mock)</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={form.aadhaar_mock}
                      onChange={(e) => update('aadhaar_mock', e.target.value.replace(/\D/g, '').slice(0, 12))}
                      placeholder="XXXX XXXX XXXX"
                      className="input-field pl-11"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">For identity verification (demo only)</p>
                </div>
                <div>
                  <label className="label">UPI ID</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">@</span>
                    <input
                      type="text"
                      value={form.upi_id}
                      onChange={(e) => update('upi_id', e.target.value)}
                      placeholder="yourname@upi"
                      className="input-field pl-8"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Payouts will be sent directly to this UPI ID</p>
                </div>
                {form.weekly_income > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-800 mb-1">Your coverage estimate:</p>
                    <div className="flex justify-between text-sm text-emerald-700">
                      <span>Weekly payout on disruption</span>
                      <span className="font-bold">₹{Number(form.weekly_income).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-600 mt-1">
                      <span>Estimated premium</span>
                      <span className="font-semibold">~₹{Math.round(Number(form.weekly_income) * 0.025).toLocaleString('en-IN')}/week</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-7">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : step < 2 ? (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Create Account
                    <Shield className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {step === 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
