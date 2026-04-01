import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { claimsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { NewClaimModal } from '../../components/NewClaimModal';
import { formatDate } from '../../lib/utils';
import { Plus, Search, AlertCircle, ReceiptText, ChevronRight } from 'lucide-react';

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

function formatAmount(amount) {
  if (!amount && amount !== 0) return null;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export default function ClaimList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      <div className="flex flex-wrap gap-3 items-center">
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
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {monthFilter && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
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

      {/* Claims list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ReceiptText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {search || statusFilter ? 'No claims match your filters.' : 'No claims yet.'}
          </p>
          {!search && !statusFilter && (
            <>
              <p className="text-sm text-gray-500 mt-1">Submit your first expense claim to get started.</p>
              {['employee', 'manager', 'admin'].includes(user.role) && (
                <Button size="sm" className="mt-4" onClick={() => setShowNewClaimModal(true)}>
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Claim
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((claim) => (
            <Link
              key={claim.id}
              to={`/claims/${claim.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:-translate-y-px transition-all group"
            >
              {/* Icon */}
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-50 transition-colors">
                <ReceiptText className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-red-700 transition-colors">
                    {claim.title}
                  </p>
                  {claim.alert_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[11px] text-red-600 flex-shrink-0 font-medium">
                      <AlertCircle className="w-3 h-3" />
                      {claim.alert_count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{formatDate(claim.updated_at)}</span>
                  {claim.owner_department && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>{claim.owner_department}</span>
                    </>
                  )}
                  {user.role !== 'employee' && claim.owner_name && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>{claim.owner_name}</span>
                    </>
                  )}
                  {claim.total_amount > 0 && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="font-medium text-gray-700">{formatAmount(claim.total_amount)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status + chevron */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <StatusBadge status={claim.status} />
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
