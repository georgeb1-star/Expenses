import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { claimsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { NewClaimModal } from '../../components/NewClaimModal';
import { formatDate } from '../../lib/utils';
import { Plus, Search, AlertCircle, ReceiptText, ChevronRight, ChevronLeft } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'manager_review', label: 'Manager Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'audit', label: 'Audit' },
  { value: 'processing', label: 'Processing' },
  { value: 'exported', label: 'Exported' },
];

const PAGE_SIZE = 20;

function formatAmount(amount) {
  if (!amount && amount !== 0) return null;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

export default function ClaimList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);

  const fetchClaims = useCallback(() => {
    setLoading(true);
    const params = { page, limit: PAGE_SIZE };
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    claimsApi.list(params)
      .then((r) => {
        setClaims(r.data.data);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleCreate = (claimId) => {
    navigate(`/claims/${claimId}`);
  };

  const hasFilters = search || statusFilter;

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
          <h1 className="text-xl font-semibold text-gray-900">
            {['processor', 'admin'].includes(user.role) ? 'All Claims' : 'My Claims'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} claim{total !== 1 ? 's' : ''} total</p>
        </div>
        {['employee', 'manager', 'admin'].includes(user.role) && (
          <Button onClick={() => setShowNewClaimModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Claim
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search by title or owner…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => setSearch(searchInput)}
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
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {loading ? '…' : `${total} result${total !== 1 ? 's' : ''}`}
        </span>
      </form>

      {/* Claims list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <ReceiptText className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {hasFilters ? 'No claims match your filters.' : 'No claims yet.'}
          </p>
          {!hasFilters && (
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
        <>
          <div className="space-y-2">
            {claims.map((claim) => (
              <Link
                key={claim.id}
                to={`/claims/${claim.id}`}
                className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:-translate-y-px transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-50 transition-colors">
                  <ReceiptText className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                </div>

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

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={claim.status} />
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination controls */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                Page {page} of {pages} · {total} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const pageNum = pages <= 5 ? i + 1 :
                      page <= 3 ? i + 1 :
                      page >= pages - 2 ? pages - 4 + i :
                      page - 2 + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                          pageNum === page
                            ? 'bg-red-700 text-white'
                            : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page === pages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
