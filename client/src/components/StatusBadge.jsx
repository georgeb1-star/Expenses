import React from 'react';
import { cn, STATUS_COLORS, STATUS_LABELS } from '../lib/utils';

export function StatusBadge({ status, className }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status], className)}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
