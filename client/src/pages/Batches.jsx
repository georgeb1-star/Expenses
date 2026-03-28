import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { batchesApi } from '../api';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { Download, Package } from 'lucide-react';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    batchesApi.list().then((r) => setBatches(r.data)).finally(() => setLoading(false));
  }, []);

  const handleExport = (batch) => {
    // Navigate to export URL — browser will download CSV
    const token = localStorage.getItem('token');
    fetch(batchesApi.exportUrl(batch.id), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `batch-${batch.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setBatches((prev) => prev.map((b) => b.id === batch.id ? { ...b, exported_at: new Date().toISOString() } : b));
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-muted-foreground">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</p>
        </div>
        <Link to="/finance">
          <Button variant="outline"><Package className="w-4 h-4 mr-2" /> Create Batch</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : batches.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No batches yet. Go to Finance to create one.</CardContent></Card>
      ) : (
        <Card>
          <div className="divide-y">
            {batches.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{batch.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {batch.claim_count} claim{batch.claim_count !== 1 ? 's' : ''} · Created {formatDate(batch.created_at)} by {batch.processor_name}
                    {batch.exported_at && ` · Exported ${formatDate(batch.exported_at)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {batch.exported_at ? (
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">Exported</span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">Pending export</span>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleExport(batch)}>
                    <Download className="w-4 h-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
