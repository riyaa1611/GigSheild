import React from 'react';
import { Shield } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-blue-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Shield className="w-14 h-14 text-primary-500 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-gray-800">GigShield</span>
          <span className="text-sm text-gray-500">{message}</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
