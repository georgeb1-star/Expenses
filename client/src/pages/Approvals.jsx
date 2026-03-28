import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { claimsApi } from '../api';
import { Card, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { formatDate } from '../lib/utils';
import { AlertCircle } from 'lucide-react';

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
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="text-muted-foreground">{claims.length} claim{claims.length !== 1 ? 's' : ''} awaiting your review</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : claims.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No claims pending approval.</CardContent></Card>
      ) : (
        <Card>
          <div className="divide-y">
            {claims.map((claim) => (
              <Link key={claim.id} to={`/claims/${claim.id}`} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{claim.title}</p>
                    {claim.alert_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3" /> {claim.alert_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {claim.owner_name} · {claim.owner_department} · Submitted {formatDate(claim.submitted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <StatusBadge status={claim.status} />
                  <span className="text-sm text-primary font-medium">Review →</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
