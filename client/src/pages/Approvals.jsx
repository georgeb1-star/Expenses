import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../lib/utils';
import { AlertCircle, ArrowRight, Clock, ClipboardCheck } from 'lucide-react';

function DaysWaitingBadge({ submittedAt }) {
  if (!submittedAt) return null;
  const days = Math.floor((Date.now() - new Date(submittedAt)) / 86400000);
  if (days <= 3) return <span className="text-xs text-gray-400">{days}d</span>;
  if (days <= 7) return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600">
      <Clock className="w-3 h-3" />{days}d
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-red-600">
      <Clock className="w-3 h-3" />{days}d
    </span>
  );
}

export default function Approvals() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    claimsApi.listAll().then((r) => {
      setClaims(r.data.data.filter((c) => ['submitted', 'manager_review'].includes(c.status)));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {claims.length} claim{claims.length !== 1 ? 's' : ''} awaiting your review
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ClipboardCheck className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No claims pending approval.</p>
          <p className="text-sm text-gray-500 mt-1">You're all caught up — nothing to review right now.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Claim</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-32">Employee</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-24 text-right">Amount</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-24">Submitted</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-12 text-center">Wait</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-20 text-right">Action</span>
          </div>

          <div className="divide-y divide-gray-100">
            {claims.map((claim) => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}`}
                className="flex md:grid md:grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                {/* Title */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-red-700 transition-colors">
                      {claim.title}
                    </p>
                    {claim.alert_count > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-red-600 flex-shrink-0 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {claim.alert_count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{claim.owner_department}</p>
                </div>

                {/* Owner */}
                <span className="hidden md:block text-sm text-gray-600 w-32 truncate">{claim.owner_name}</span>

                {/* Amount */}
                <span className="hidden md:block text-sm font-semibold text-gray-900 w-24 text-right tabular-nums">
                  {claim.total_amount > 0 ? formatCurrency(claim.total_amount) : <span className="text-gray-300">—</span>}
                </span>

                {/* Submitted date */}
                <span className="hidden md:block text-sm text-gray-500 w-24">{formatDate(claim.submitted_at)}</span>

                {/* Days waiting */}
                <div className="hidden md:flex w-12 justify-center">
                  <DaysWaitingBadge submittedAt={claim.submitted_at} />
                </div>

                {/* Action */}
                <div className="w-20 flex items-center justify-end gap-1 flex-shrink-0">
                  <span className="text-xs font-medium text-red-700 group-hover:text-red-800">Review</span>
                  <ArrowRight className="w-3 h-3 text-red-400 group-hover:text-red-700 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
