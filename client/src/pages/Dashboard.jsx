import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { claimsApi, reportsApi } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/StatusBadge';
import { NewClaimModal } from '../components/NewClaimModal';
import { formatCurrency, formatDate } from '../lib/utils';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Clock, CheckCircle, Send, ArrowRight, AlertCircle, Plus, Package, Search, TrendingUp } from 'lucide-react';

const CATEGORY_COLORS = ['#CC1719', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#D97706'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [teamSummary, setTeamSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);

  const handleCreate = (claimId) => {
    navigate(`/claims/${claimId}`);
  };

  useEffect(() => {
    Promise.all([
      claimsApi.list(),
      ['processor', 'admin', 'manager'].includes(user.role) ? reportsApi.summary() : Promise.resolve(null),
      user.role === 'employee' ? reportsApi.employeeSummary() : Promise.resolve(null),
      ['manager', 'admin'].includes(user.role) ? reportsApi.teamSummary() : Promise.resolve(null),
    ]).then(([claimsRes, summaryRes, empRes, teamRes]) => {
      setClaims(claimsRes.data);
      if (summaryRes) setSummary(summaryRes.data);
      if (empRes) setEmployeeSummary(empRes.data);
      if (teamRes) setTeamSummary(teamRes.data);
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
  const readyToBatch = claims.filter((c) => c.status === 'processing' && !c.batch_id);
  const processing = claims.filter((c) => c.status === 'processing');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {showNewClaimModal && (
        <NewClaimModal
          onSuccess={handleCreate}
          onCancel={() => setShowNewClaimModal(false)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user.name}</p>
        </div>
        {['employee', 'manager', 'admin'].includes(user.role) && (
          <Button onClick={() => setShowNewClaimModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Claim
          </Button>
        )}
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
          href={['processor', 'admin'].includes(user.role) ? '/finance' : '/claims'}
          iconColor="text-red-700"
          iconBg="bg-red-50"
        />
        <MetricCard
          icon={CheckCircle}
          label="Approved"
          value={approved.length}
          href={['processor', 'admin'].includes(user.role) ? '/finance' : '/claims'}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <MetricCard
          icon={Send}
          label="Exported"
          value={exported.length}
          href={['processor', 'admin'].includes(user.role) ? '/batches' : '/claims'}
          iconColor="text-teal-600"
          iconBg="bg-teal-50"
        />
      </div>

      {/* Processor finance queue */}
      {['processor', 'admin'].includes(user.role) && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Finance Queue</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Link to="/finance" className="block group">
              <div className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all">
                <div className="p-2.5 rounded bg-green-50 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">{readyToBatch.length}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Ready to Batch</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </Link>
            <Link to="/finance" className="block group">
              <div className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="p-2.5 rounded bg-purple-50 flex-shrink-0">
                  <Search className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">{readyForAudit.length}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">In Audit</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </Link>
            <Link to="/batches" className="block group">
              <div className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="p-2.5 rounded bg-orange-50 flex-shrink-0">
                  <Package className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">{processing.length}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Processing — Export Ready</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Action items for managers/processors */}
      {(user.role === 'manager' || user.role === 'processor' || user.role === 'admin') && (pendingApprovals.length > 0 || readyToBatch.length > 0) && (
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
          {user.role !== 'manager' && readyToBatch.length > 0 && (
            <Link to="/finance" className="block">
              <div className="flex items-center justify-between px-5 py-4 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-purple-900">
                    {readyToBatch.length} claim{readyToBatch.length !== 1 ? 's' : ''} passed audit — ready to batch
                  </p>
                  <p className="text-xs text-purple-700 mt-0.5">Go to Finance to create a payment batch</p>
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
                <Link to="/claims" className="text-xs text-red-700 hover:text-red-800 font-medium">
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
                  color="text-red-700"
                  dotColor="bg-red-600"
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
              {(user.role === 'processor' || user.role === 'admin') && readyToBatch.length > 0 && (
                <ActionItem
                  label="Passed audit, ready to batch"
                  count={readyToBatch.length}
                  href="/finance"
                  color="text-purple-700"
                  dotColor="bg-purple-500"
                />
              )}
              {draft.length === 0 && inProgress.length === 0 && pendingApprovals.length === 0 && readyToBatch.length === 0 && (
                <p className="text-sm text-gray-500 py-2">No items require your attention.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager team spend overview */}
      {['manager', 'admin'].includes(user.role) && teamSummary && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Team Overview</h2>

          {/* Stat row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pending Approval</p>
              <p className="text-xl sm:text-2xl font-semibold text-amber-700 mt-1 tabular-nums">{teamSummary.pending_count}</p>
              <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{formatCurrency(teamSummary.pending_amount)} total</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Team Spend (Month)</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{formatCurrency(teamSummary.approved_this_month)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Approved</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{formatCurrency(teamSummary.total_approved)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Team Size</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{teamSummary.team_size}</p>
              <p className="text-xs text-gray-400 mt-0.5">direct reports</p>
            </div>
          </div>

          {/* Category + team members */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Spend by Category</CardTitle></CardHeader>
              <CardContent>
                {teamSummary.by_category?.length > 0 ? (
                  <div className="space-y-2.5">
                    {teamSummary.by_category.map((cat, i) => {
                      const total = teamSummary.by_category.reduce((s, c) => s + parseFloat(c.amount || 0), 0);
                      const pct = total > 0 ? Math.round((parseFloat(cat.amount || 0) / total) * 100) : 0;
                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium capitalize">{cat.category || 'Other'}</span>
                            <span className="text-gray-500 tabular-nums">{formatCurrency(cat.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">No approved spend yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
              <CardContent className="p-0">
                {teamSummary.by_employee?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {teamSummary.by_employee.map((emp) => (
                      <div key={emp.id} className="flex items-center justify-between px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                            {emp.pending_count > 0 && (
                              <span className="flex-shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                {emp.pending_count} pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{emp.department || 'No department'} · {emp.claim_count} claim{emp.claim_count !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums ml-4">{formatCurrency(emp.total_amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center px-5">No team members assigned yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Employee spend overview */}
      {user.role === 'employee' && employeeSummary && (
        <div className="space-y-4">
          {/* Stat row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Approved (All-time)</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{formatCurrency(employeeSummary.total_approved)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Approved This Month</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{formatCurrency(employeeSummary.total_this_month)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Awaiting Approval</p>
              <p className="text-xl sm:text-2xl font-semibold text-amber-700 mt-1 tabular-nums">{formatCurrency(employeeSummary.total_pending)}</p>
            </div>
          </div>

          {/* Area chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Spend Overview</CardTitle>
                <span className="text-xs text-gray-400">Last 90 days — approved expenses only</span>
              </div>
            </CardHeader>
            <CardContent>
              {employeeSummary.daily_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart
                    data={employeeSummary.daily_trend}
                    margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#CC1719" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#CC1719" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(d) => {
                        const dt = new Date(d);
                        return `${dt.getDate()} ${dt.toLocaleString('en-GB', { month: 'short' })}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `£${v}`}
                      domain={[0, (dataMax) => Math.ceil(dataMax * 1.25)]}
                    />
                    <Tooltip
                      formatter={(v) => [formatCurrency(v), 'Spend']}
                      labelFormatter={(d) => {
                        const dt = new Date(d);
                        return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      }}
                      contentStyle={{
                        fontSize: 12,
                        border: '1px solid #E5E7EB',
                        borderRadius: 4,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#CC1719"
                      strokeWidth={2}
                      fill="url(#spendGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#CC1719' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 py-8 text-center">No approved spend in the last 90 days.</p>
              )}
            </CardContent>
          </Card>

          {/* Category breakdown + recent items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
              <CardContent>
                {employeeSummary.by_category?.length > 0 ? (
                  <div className="space-y-2.5">
                    {employeeSummary.by_category.map((cat, i) => {
                      const total = employeeSummary.by_category.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
                      const pct = total > 0 ? Math.round(((parseFloat(cat.amount) || 0) / total) * 100) : 0;
                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-700 font-medium capitalize">{cat.category || 'Other'}</span>
                            <span className="text-gray-500 tabular-nums">{formatCurrency(cat.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center">No category data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Recent Approved Expenses</CardTitle></CardHeader>
              <CardContent className="p-0">
                {employeeSummary.recent_items?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {employeeSummary.recent_items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.supplier || item.claim_title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.expense_type} · {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums ml-4">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-4 text-center px-5">No approved expenses yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
              <div className="flex items-center justify-between">
                <CardTitle>Monthly Spend</CardTitle>
                <span className="text-xs text-gray-400">Click a bar to view claims</span>
              </div>
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
                    <Bar
                      dataKey="amount"
                      fill="#CC1719"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={32}
                      cursor="pointer"
                      onClick={(data) => navigate(`/claims?month=${data.month}`)}
                    />
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
