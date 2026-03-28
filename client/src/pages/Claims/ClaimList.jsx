import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { claimsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate } from '../../lib/utils';
import { Plus, Search, AlertCircle } from 'lucide-react';

export default function ClaimList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    claimsApi.list().then((r) => setClaims(r.data)).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const title = prompt('Claim title (e.g. "March Travel Expenses"):');
    if (!title) return;
    const { data } = await claimsApi.create({ title });
    navigate(`/claims/${data.id}`);
  };

  const filtered = claims.filter((c) => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.owner_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ['draft', 'submitted', 'manager_review', 'approved', 'audit', 'processing', 'exported'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Claims</h1>
          <p className="text-muted-foreground">{claims.length} total</p>
        </div>
        {['employee', 'manager', 'admin'].includes(user.role) && (
          <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" /> New Claim</Button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search claims…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No claims found.</CardContent></Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((claim) => (
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
                    {user.role !== 'employee' && `${claim.owner_name} · `}
                    {claim.owner_department} · Updated {formatDate(claim.updated_at)}
                  </p>
                </div>
                <StatusBadge status={claim.status} className="ml-4 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
