import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi, batchesApi } from '../api';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { Package, AlertCircle } from 'lucide-react';

export default function Finance() {
  const [claims, setClaims] = useState([]);
  const [selected, setSelected] = useState([]);
  const [batchName, setBatchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    claimsApi.list().then((r) => {
      setClaims(r.data.filter((c) => c.status === 'approved'));
    }).finally(() => setLoading(false));
  }, []);

  const allSelected = selected.length === claims.length && claims.length > 0;

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : claims.map((c) => c.id));
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) { setError('Enter a batch name before creating.'); return; }
    if (!selected.length) { setError('Select at least one claim to include in the batch.'); return; }
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Finance — Approved Claims</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {claims.length} claim{claims.length !== 1 ? 's' : ''} ready to batch for audit
          </p>
        </div>
      </div>

      {/* Batch creation panel — only shown when items selected */}
      {selected.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded p-4">
          <p className="text-sm font-medium text-red-900 mb-3">
            {selected.length} claim{selected.length !== 1 ? 's' : ''} selected — create a batch to send to audit
          </p>
          <div className="flex items-start gap-3">
            <div className="flex-1 max-w-xs">
              <label className="text-xs font-medium text-red-800 block mb-1">Batch name</label>
              <input
                type="text"
                className="h-9 w-full rounded border border-red-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                placeholder="e.g. March 2025 – Batch 1"
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

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : claims.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-gray-200 rounded bg-white">
          <p className="text-sm font-medium text-gray-700">No approved claims awaiting audit.</p>
          <p className="text-sm text-gray-500 mt-1">Claims will appear here once they've been approved by a manager.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded bg-white overflow-hidden">
          {/* Table header with select-all */}
          <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="rounded border-gray-300 text-red-700 focus:ring-red-600"
              aria-label="Select all claims"
            />
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex-1">Claim</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">Owner</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28">Approved</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-24 text-right">Status</span>
          </div>

          <div className="divide-y divide-gray-100">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${selected.includes(claim.id) ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(claim.id)}
                  onChange={() => toggleSelect(claim.id)}
                  className="rounded border-gray-300 text-red-700 focus:ring-red-600"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/claims/${claim.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-red-700 truncate block transition-colors"
                  >
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
  );
}
