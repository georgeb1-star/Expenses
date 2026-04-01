import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { batchesApi } from '../api';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { Download, Package, ExternalLink } from 'lucide-react';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    batchesApi.list().then((r) => setBatches(r.data)).finally(() => setLoading(false));
  }, []);

  const handleExport = async (batch, format) => {
    const url = format ? `/batches/${batch.id}/export?format=${format}` : `/batches/${batch.id}/export`;
    const { data } = await api.get(url, { responseType: 'blob' });
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    const suffix = format === 'sage' ? '-sage50' : '';
    a.download = `batch-${batch.name.replace(/[^a-z0-9]/gi, '_')}${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(objectUrl);
    setBatches((prev) =>
      prev.map((b) => b.id === batch.id ? { ...b, exported_at: new Date().toISOString() } : b)
    );
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Link to="/finance">
          <Button variant="outline" size="sm">
            <Package className="w-4 h-4 mr-1.5" />
            Create Batch
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No batches yet.</p>
          <p className="text-sm text-gray-500 mt-1">
            Go to <Link to="/finance" className="text-red-700 hover:underline">Finance</Link> to audit claims and create your first batch.
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-2.5 bg-gray-50 border-b border-gray-200">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Batch</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-32">Created</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28 text-center">Status</span>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-40 text-right">Export</span>
          </div>

          <div className="divide-y divide-gray-100">
            {batches.map((batch) => (
              <div key={batch.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                {/* Batch info */}
                <div>
                  <p className="text-sm font-medium text-gray-900">{batch.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {batch.claim_count} claim{batch.claim_count !== 1 ? 's' : ''} · Created by {batch.processor_name}
                  </p>
                </div>

                {/* Created date */}
                <span className="text-sm text-gray-500 w-32">{formatDate(batch.created_at)}</span>

                {/* Status badge */}
                <div className="w-28 flex justify-center">
                  {batch.exported_at ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700">
                      Exported {formatDate(batch.exported_at)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700">
                      Pending export
                    </span>
                  )}
                </div>

                {/* Export actions */}
                <div className="w-40 flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport(batch)}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport(batch, 'sage')}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Sage 50
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
