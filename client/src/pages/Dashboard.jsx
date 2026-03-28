import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { claimsApi, reportsApi } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Dashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      claimsApi.list(),
      ['processor', 'admin', 'manager'].includes(user.role) ? reportsApi.summary() : Promise.resolve(null),
    ]).then(([claimsRes, summaryRes]) => {
      setClaims(claimsRes.data);
      if (summaryRes) setSummary(summaryRes.data);
    }).finally(() => setLoading(false));
  }, [user.role]);

  const draft = claims.filter((c) => c.status === 'draft');
  const open = claims.filter((c) => ['submitted', 'manager_review', 'audit', 'processing'].includes(c.status));
  const approved = claims.filter((c) => c.status === 'approved');
  const exported = claims.filter((c) => c.status === 'exported');

  const recentClaims = [...claims].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 5);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user.name}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Available" value={draft.length} color="text-gray-600" href="/claims" />
        <StatCard icon={Clock} label="In Progress" value={open.length} color="text-blue-600" href="/claims" />
        <StatCard icon={CheckCircle} label="Approved" value={approved.length} color="text-green-600" href="/claims" />
        <StatCard icon={AlertCircle} label="Exported" value={exported.length} color="text-emerald-600" href="/claims" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent claims */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Claims</CardTitle>
                <Link to="/claims" className="text-sm text-primary hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentClaims.length === 0 ? (
                <p className="text-muted-foreground text-sm">No claims yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentClaims.map((claim) => (
                    <Link key={claim.id} to={`/claims/${claim.id}`} className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors">
                      <div>
                        <p className="text-sm font-medium">{claim.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(claim.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {claim.alert_count > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            {claim.alert_count} alert{claim.alert_count > 1 ? 's' : ''}
                          </span>
                        )}
                        <StatusBadge status={claim.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My tasks */}
        <Card>
          <CardHeader><CardTitle>My Tasks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {draft.length > 0 && (
                <TaskItem label="Available expenses" count={draft.length} href="/claims" color="bg-gray-100 text-gray-700" />
              )}
              {open.length > 0 && (
                <TaskItem label="Open claims" count={open.length} href="/claims" color="bg-blue-100 text-blue-700" />
              )}
              {user.role === 'manager' && (
                <TaskItem label="Pending approvals" count={claims.filter(c => c.status === 'manager_review').length} href="/approvals" color="bg-yellow-100 text-yellow-700" />
              )}
              {user.role === 'processor' && (
                <TaskItem label="Ready for audit" count={claims.filter(c => c.status === 'audit').length} href="/finance" color="bg-purple-100 text-purple-700" />
              )}
              {draft.length === 0 && open.length === 0 && <p className="text-sm text-muted-foreground">No tasks right now.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance charts */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Spend by Category</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={summary.by_category} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                      {summary.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {summary.by_category.slice(0, 5).map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="truncate text-xs">{cat.category || 'Other'}</span>
                      <span className="ml-auto text-xs font-medium">{formatCurrency(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Monthly Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={summary.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, href }) {
  return (
    <Link to={href}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex items-center gap-4">
          <div className={`p-2 rounded-lg bg-gray-100 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function TaskItem({ label, count, href, color }) {
  return (
    <Link to={href} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
      <span className="text-sm">{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{count}</span>
    </Link>
  );
}
