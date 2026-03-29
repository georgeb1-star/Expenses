import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function Approvals() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    claimsApi.list().then((r) => {
      setClaims(r.data.filter((c) => c.status === 'manager_review'));
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
        <div className="flex flex-col items-center justify-center py-16 text-center border border-gray-200 rounded bg-white">
          <p className="text-sm font-medium text-gray-700">No claims pending approval.</p>
          <p className="text-sm text-gray-500 mt-1">You're all caught up.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Claim</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Submitted by</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28">Submitted</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-20 text-right">Action</span>
          </div>

          <div className="divide-y divide-gray-100">
            {claims.map((claim) => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                {/* Title */}
                <div className="min-w-0">
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
                <span className="text-sm text-gray-600 w-36 truncate">{claim.owner_name}</span>

                {/* Submitted date */}
                <span className="text-sm text-gray-500 w-28">{formatDate(claim.submitted_at)}</span>

                {/* Action */}
                <div className="w-20 flex items-center justify-end gap-1">
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
