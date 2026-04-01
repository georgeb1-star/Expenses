import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi, batchesApi } from '../api';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { Package, AlertCircle, ArrowRight, ClipboardCheck, Search, X } from 'lucide-react';
import { Input } from '../components/ui/Input';

export default function Finance() {
  const [needsAudit, setNeedsAudit] = useState([]);
  const [readyToBatch, setReadyToBatch] = useState([]);
  const [selected, setSelected] = useState([]);
  const [batchName, setBatchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [batchSearch, setBatchSearch] = useState('');

  useEffect(() => {
    claimsApi.listAll().then((r) => {
      setNeedsAudit(r.data.data.filter((c) => ['approved', 'audit'].includes(c.status)));
      setReadyToBatch(r.data.data.filter((c) => c.status === 'processing' && !c.batch_id));
    }).finally(() => setLoading(false));
  }, []);

  const allSelected = selected.length === readyToBatch.length && readyToBatch.length > 0;
  const toggleSelect = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(allSelected ? [] : readyToBatch.map((c) => c.id));

  const handleCreateBatch = async () => {
    if (!batchName.trim()) { setError('Enter a batch name before creating.'); return; }
    if (!selected.length) { setError('Select at least one claim to batch.'); return; }
    setCreating(true);
    setError('');
    try {
      const { data } = await batchesApi.create({ name: batchName, claim_ids: selected });
      window.location.href = `/batches/${data.id}`;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create batch.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
    </div>
  );

  const filteredAudit = needsAudit.filter((c) =>
    !auditSearch ||
    c.title.toLowerCase().includes(auditSearch.toLowerCase()) ||
    c.owner_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    c.owner_department?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const filteredBatch = readyToBatch.filter((c) =>
    !batchSearch ||
    c.title.toLowerCase().includes(batchSearch.toLowerCase()) ||
    c.owner_name?.toLowerCase().includes(batchSearch.toLowerCase()) ||
    c.owner_department?.toLowerCase().includes(batchSearch.toLowerCase())
  );

  return (
    <div className="space-y-8">

      {/* Section 1: Needs Audit */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
              Needs Audit
              {needsAudit.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                  {needsAudit.length}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Approved by manager — open each claim to review receipts and pass or fail the audit
            </p>
          </div>
          {needsAudit.length > 0 && (
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search by name or dept…"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
              {auditSearch && (
                <button onClick={() => setAuditSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {needsAudit.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-white border border-gray-200 rounded-xl text-center">
            <ClipboardCheck className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No claims waiting for audit</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex-1">Claim</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Owner</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28">Approved</span>
              <span className="w-20" />
            </div>
            <div className="divide-y divide-gray-100">
              {filteredAudit.length === 0 && (
                <p className="text-sm text-gray-500 px-5 py-4">No results match your search.</p>
              )}
              {filteredAudit.map((claim) => (
                <div key={claim.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{claim.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{claim.owner_department}</p>
                  </div>
                  <span className="text-sm text-gray-600 w-36 truncate">{claim.owner_name}</span>
                  <span className="text-sm text-gray-500 w-28">{formatDate(claim.approved_at)}</span>
                  <div className="w-20 flex justify-end">
                    <Link
                      to={`/claims/${claim.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-800 transition-colors"
                    >
                      Review
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200" />

      {/* Section 2: Ready to Batch */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-red-700" />
              Ready to Batch
              {readyToBatch.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full">
                  {readyToBatch.length}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Passed audit — select claims to group into a payment batch for export
            </p>
          </div>
          {readyToBatch.length > 0 && (
            <div className="relative w-full sm:w-64 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search by name or dept…"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
              />
              {batchSearch && (
                <button onClick={() => setBatchSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-xl p-4">
            <p className="text-sm font-medium text-red-900 mb-3">
              {selected.length} claim{selected.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex items-start gap-3">
              <div className="flex-1 max-w-xs">
                <label className="text-xs font-medium text-red-800 block mb-1">Batch name</label>
                <input
                  type="text"
                  className="h-9 w-full rounded border border-red-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                  placeholder="e.g. April 2026 – Batch 1"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateBatch()}
                />
                {error && (
                  <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              <div className="pt-5">
                <Button onClick={handleCreateBatch} disabled={creating} size="sm">
                  <Package className="w-4 h-4 mr-1.5" />
                  {creating ? 'Creating…' : 'Create Batch'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {readyToBatch.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-white border border-gray-200 rounded-xl text-center">
            <Package className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No claims ready to batch</p>
            <p className="text-xs text-gray-400 mt-1">Audit claims above to move them into the ready state</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
              <input type="checkbox" checked={allSelected} onChange={toggleAll}
                className="rounded border-gray-300 text-red-700 focus:ring-red-600" />
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex-1">Claim</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Owner</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28">Approved</span>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-24 text-right">Status</span>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredBatch.length === 0 && (
                <p className="text-sm text-gray-500 px-5 py-4">No results match your search.</p>
              )}
              {filteredBatch.map((claim) => (
                <div key={claim.id}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${selected.includes(claim.id) ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}
                >
                  <input type="checkbox" checked={selected.includes(claim.id)} onChange={() => toggleSelect(claim.id)}
                    className="rounded border-gray-300 text-red-700 focus:ring-red-600" />
                  <div className="flex-1 min-w-0">
                    <Link to={`/claims/${claim.id}`} className="text-sm font-medium text-gray-900 hover:text-red-700 truncate block transition-colors">
                      {claim.title}
                    </Link>
                    <p className="text-xs text-gray-500 mt-0.5">{claim.owner_department}</p>
                  </div>
                  <span className="text-sm text-gray-600 w-36 truncate">{claim.owner_name}</span>
                  <span className="text-sm text-gray-500 w-28">{formatDate(claim.approved_at)}</span>
                  <div className="w-24 flex justify-end">
                    <StatusBadge status={claim.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
