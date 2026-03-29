import React from 'react';
import { cn, STATUS_COLORS, STATUS_LABELS } from '../lib/utils';

export function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium leading-none whitespace-nowrap',
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
