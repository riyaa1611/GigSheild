import React from 'react';

const variants = {
  pending:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
  approved:  'bg-blue-100 text-blue-800 border border-blue-200',
  paid:      'bg-green-100 text-green-800 border border-green-200',
  flagged:   'bg-red-100 text-red-800 border border-red-200',
  active:    'bg-emerald-100 text-emerald-800 border border-emerald-200',
  inactive:  'bg-gray-100 text-gray-600 border border-gray-200',
  rejected:  'bg-red-100 text-red-800 border border-red-200',
  processing:'bg-purple-100 text-purple-800 border border-purple-200',
};

const labels = {
  pending:    'Pending',
  approved:   'Approved',
  paid:       'Paid',
  flagged:    'Flagged',
  active:     'Active',
  inactive:   'Inactive',
  rejected:   'Rejected',
  processing: 'Processing',
};

export default function StatusBadge({ status, className = '' }) {
  const key = (status || '').toLowerCase();
  const style = variants[key] || 'bg-gray-100 text-gray-600 border border-gray-200';
  const label = labels[key] || status || 'Unknown';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />
      {label}
    </span>
  );
}
