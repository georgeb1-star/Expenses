import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { claimsApi, reportsApi } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, CheckCircle, Send, ArrowRight, AlertCircle } from 'lucide-react';

const CATEGORY_COLORS = ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#0891B2'];

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
  const inProgress = claims.filter((c) => ['submitted', 'manager_review', 'audit', 'processing'].includes(c.status));
  const approved = claims.filter((c) => c.status === 'approved');
  const exported = claims.filter((c) => c.status === 'exported');

  const recentClaims = [...claims]
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 6);

  const pendingApprovals = claims.filter((c) => c.status === 'manager_review');
  const readyForAudit = claims.filter((c) => c.status === 'audit');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user.name}</p>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={FileText}
          label="Draft Claims"
          value={draft.length}
          href="/claims"
          iconColor="text-gray-500"
          iconBg="bg-gray-100"
        />
        <MetricCard
          icon={Clock}
          label="In Progress"
          value={inProgress.length}
          href="/claims"
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <MetricCard
          icon={CheckCircle}
          label="Approved"
          value={approved.length}
          href="/claims"
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <MetricCard
          icon={Send}
          label="Exported"
          value={exported.length}
          href="/claims"
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
      </div>

      {/* Action items for managers/processors */}
      {(user.role === 'manager' || user.role === 'processor' || user.role === 'admin') && (pendingApprovals.length > 0 || readyForAudit.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {user.role !== 'processor' && pendingApprovals.length > 0 && (
            <Link to="/approvals" className="block">
              <div className="flex items-center justify-between px-5 py-4 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {pendingApprovals.length} claim{pendingApprovals.length !== 1 ? 's' : ''} awaiting your approval
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">Review pending claims in the Approvals queue</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
              </div>
            </Link>
          )}
          {user.role !== 'manager' && readyForAudit.length > 0 && (
            <Link to="/finance" className="block">
              <div className="flex items-center justify-between px-5 py-4 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    {readyForAudit.length} claim{readyForAudit.length !== 1 ? 's' : ''} ready for audit
                  </p>
                  <p className="text-xs text-purple-700 mt-0.5">Process approved claims through Finance</p>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-600 flex-shrink-0" />
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent claims table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Claims</CardTitle>
                <Link to="/claims" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View all
                </Link>
              </div>
            </CardHeader>
            {recentClaims.length === 0 ? (
              <CardContent>
                <p className="text-sm text-gray-500 py-4 text-center">No claims yet. Start by creating your first claim.</p>
              </CardContent>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentClaims.map((claim) => (
                  <Link
                    key={claim.id}
                    to={`/claims/${claim.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{claim.title}</p>
                        {claim.alert_count > 0 && (
                          <span className="flex items-center gap-0.5 text-[11px] text-red-600 flex-shrink-0">
                            <AlertCircle className="w-3 h-3" />
                            {claim.alert_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(claim.updated_at)}</p>
                    </div>
                    <StatusBadge status={claim.status} className="flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Tasks / action items */}
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {draft.length > 0 && (
                <ActionItem
                  label="Draft expenses"
                  count={draft.length}
                  href="/claims"
                  color="text-gray-600"
                  dotColor="bg-gray-400"
                />
              )}
              {inProgress.length > 0 && (
                <ActionItem
                  label="Claims in progress"
                  count={inProgress.length}
                  href="/claims"
                  color="text-blue-700"
                  dotColor="bg-blue-500"
                />
              )}
              {user.role === 'manager' && pendingApprovals.length > 0 && (
                <ActionItem
                  label="Pending approvals"
                  count={pendingApprovals.length}
                  href="/approvals"
                  color="text-amber-700"
                  dotColor="bg-amber-500"
                />
              )}
              {(user.role === 'processor' || user.role === 'admin') && readyForAudit.length > 0 && (
                <ActionItem
                  label="Ready for audit"
                  count={readyForAudit.length}
                  href="/finance"
                  color="text-purple-700"
                  dotColor="bg-purple-500"
                />
              )}
              {draft.length === 0 && inProgress.length === 0 && pendingApprovals.length === 0 && readyForAudit.length === 0 && (
                <p className="text-sm text-gray-500 py-2">No items require your attention.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finance charts — managers and processors only */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spend by category */}
          <Card>
            <CardHeader>
              <CardTitle>Spend by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.by_category?.length > 0 ? (
                <div className="space-y-2.5">
                  {summary.by_category.slice(0, 6).map((cat, i) => {
                    const total = summary.by_category.reduce((s, c) => s + (c.amount || 0), 0);
                    const pct = total > 0 ? Math.round(((cat.amount || 0) / total) * 100) : 0;
                    return (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 font-medium">{cat.category || 'Other'}</span>
                          <span className="text-gray-500 tabular-nums">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">No category data available.</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly trend */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Spend</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.monthly_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={summary.monthly_trend}
                    margin={{ top: 0, right: 0, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v) => [formatCurrency(v), 'Spend']}
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid #E5E7EB',
                        borderRadius: 4,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                      cursor={{ fill: '#F3F4F6' }}
                    />
                    <Bar dataKey="amount" fill="#2563EB" radius={[2, 2, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-4 text-center">No trend data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, href, iconColor, iconBg }) {
  return (
    <Link to={href}>
      <Card className="hover:border-gray-300 transition-colors">
        <CardContent className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
            </div>
            <div className={`p-2.5 rounded ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ActionItem({ label, count, href, color, dotColor }) {
  return (
    <Link
      to={href}
      className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-semibold tabular-nums ${color}`}>{count}</span>
        <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
