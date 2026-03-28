import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi, batchesApi } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../lib/utils';
import { Package } from 'lucide-react';

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

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) { setError('Please enter a batch name'); return; }
    if (!selected.length) { setError('Select at least one claim'); return; }
    setCreating(true);
    setError('');
    try {
      const { data } = await batchesApi.create({ name: batchName, claim_ids: selected });
      window.location.href = `/batches/${data.id}`;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance — Approved Claims</h1>
        <p className="text-muted-foreground">{claims.length} claim{claims.length !== 1 ? 's' : ''} ready for audit</p>
      </div>

      {selected.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium">{selected.length} claim{selected.length > 1 ? 's' : ''} selected</p>
              <input
                type="text"
                className="mt-2 h-9 rounded-md border border-input bg-background px-3 text-sm w-64"
                placeholder="Batch name e.g. March 2025 – Batch 1"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
              />
              {error && <p className="text-xs text-destructive mt-1">{error}</p>}
            </div>
            <Button onClick={handleCreateBatch} disabled={creating}>
              <Package className="w-4 h-4 mr-2" />
              {creating ? 'Creating…' : 'Create Batch'}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : claims.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No approved claims awaiting audit.</CardContent></Card>
      ) : (
        <Card>
          <div className="divide-y">
            <div className="flex items-center gap-4 p-4 bg-muted/30">
              <input type="checkbox"
                checked={selected.length === claims.length}
                onChange={() => setSelected(selected.length === claims.length ? [] : claims.map((c) => c.id))}
                className="rounded"
              />
              <span className="text-xs font-medium text-muted-foreground uppercase">Select all</span>
            </div>
            {claims.map((claim) => (
              <div key={claim.id} className="flex items-center gap-4 p-4 hover:bg-muted/30">
                <input type="checkbox" checked={selected.includes(claim.id)} onChange={() => toggleSelect(claim.id)} className="rounded" />
                <div className="flex-1 min-w-0">
                  <Link to={`/claims/${claim.id}`} className="font-medium hover:text-primary truncate block">{claim.title}</Link>
                  <p className="text-sm text-muted-foreground">
                    {claim.owner_name} · {claim.owner_department} · Approved {formatDate(claim.approved_at)}
                  </p>
                </div>
                <StatusBadge status={claim.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
