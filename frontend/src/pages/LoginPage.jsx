import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, adminLogin } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      if (isAdmin) {
        await adminLogin(email, password);
        navigate('/admin');
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Invalid credentials. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <div className="pt-8 pb-4 px-6 text-center">
        <div className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-md shadow-orange-200">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">GigShield</span>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          {/* Hero text */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isAdmin ? 'Admin Portal' : 'Welcome back'}
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              {isAdmin
                ? 'Sign in to the GigShield admin console'
                : 'Your income is protected. Sign in to check your coverage.'}
            </p>
          </div>

          {/* Mode toggle pills */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => { setIsAdmin(false); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !isAdmin
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Delivery Worker
            </button>
            <button
              onClick={() => { setIsAdmin(true); setError(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isAdmin
                  ? 'bg-white text-shield-blue shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Admin Login
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 p-7">
            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-11"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="input-field pl-11 pr-11"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base text-white transition-all ${
                  isAdmin
                    ? 'bg-shield-blue hover:bg-blue-800 disabled:opacity-50'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-orange-200 disabled:opacity-50'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isAdmin ? 'Sign in as Admin' : 'Sign in'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {!isAdmin && (
              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500">
                  New to GigShield?{' '}
                  <Link to="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                    Create your account
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Trust indicators */}
          {!isAdmin && (
            <div className="mt-6 flex items-center justify-center gap-6">
              {['100% Digital', 'Auto-Payouts', 'No Paperwork'].map((text) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  {text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
