import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { claimsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { NewClaimModal } from '../../components/NewClaimModal';
import { formatDate } from '../../lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'manager_review', label: 'Manager Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'audit', label: 'Audit' },
  { value: 'processing', label: 'Processing' },
  { value: 'exported', label: 'Exported' },
];

export default function ClaimList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [claims, setClaims] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(searchParams.get('month') || '');
  const [loading, setLoading] = useState(true);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);

  useEffect(() => {
    claimsApi.list().then((r) => setClaims(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = (claimId) => {
    navigate(`/claims/${claimId}`);
  };

  const filtered = claims.filter((c) => {
    const matchSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchMonth = !monthFilter || (c.updated_at && c.updated_at.slice(0, 7) === monthFilter);
    return matchSearch && matchStatus && matchMonth;
  });

  return (
    <div className="space-y-6">
      {showNewClaimModal && (
        <NewClaimModal
          onSuccess={handleCreate}
          onCancel={() => setShowNewClaimModal(false)}
        />
      )}
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Claims</h1>
          <p className="text-sm text-gray-500 mt-0.5">{claims.length} claim{claims.length !== 1 ? 's' : ''} total</p>
        </div>
        {['employee', 'manager', 'admin'].includes(user.role) && (
          <Button onClick={() => setShowNewClaimModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Claim
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search by title or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {monthFilter && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
            {monthFilter}
            <button onClick={() => setMonthFilter('')} className="hover:text-red-900">✕</button>
          </div>
        )}
        {(search || statusFilter || monthFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setMonthFilter(''); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Claims table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-gray-200 rounded bg-white">
          <p className="text-sm font-medium text-gray-700">
            {search || statusFilter ? 'No claims match your filters.' : 'No claims yet.'}
          </p>
          {!search && !statusFilter && (
            <p className="text-sm text-gray-500 mt-1">
              Create your first claim to get started.
            </p>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Claim</span>
            {user.role !== 'employee' && (
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Owner</span>
            )}
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28">Updated</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28 text-right">Status</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map((claim) => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                {/* Title + alerts */}
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
                  {user.role !== 'employee' && (
                    <p className="text-xs text-gray-500 mt-0.5">{claim.owner_department}</p>
                  )}
                </div>

                {/* Owner — non-employees only */}
                {user.role !== 'employee' && (
                  <span className="text-sm text-gray-600 w-36 truncate">{claim.owner_name}</span>
                )}

                {/* Date */}
                <span className="text-sm text-gray-500 w-28">{formatDate(claim.updated_at)}</span>

                {/* Status */}
                <div className="w-28 flex justify-end">
                  <StatusBadge status={claim.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
