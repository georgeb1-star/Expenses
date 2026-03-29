import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount || 0);
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  manager_review: 'Manager Review',
  approved: 'Approved',
  audit: 'Audit',
  processing: 'Processing',
  exported: 'Exported',
};

export const STATUS_COLORS = {
  draft:          'bg-gray-100 text-gray-600',
  submitted:      'bg-blue-50 text-blue-700',
  manager_review: 'bg-amber-50 text-amber-700',
  approved:       'bg-green-50 text-green-700',
  audit:          'bg-purple-50 text-purple-700',
  processing:     'bg-orange-50 text-orange-700',
  exported:       'bg-teal-50 text-teal-700',
};

export const STATUS_STEPS = [
  'draft', 'submitted', 'manager_review', 'approved', 'audit', 'processing', 'exported'
];
