import React, { useEffect, useState } from 'react';
import { reportsApi } from '../api';
import { formatCurrency } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, ReceiptText, Users } from 'lucide-react';

const CATEGORY_COLORS = ['#CC1719', '#16A34A', '#D97706', '#7C3AED', '#0891B2', '#EA580C', '#6B7280'];

function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="bg-white border border-gray-200 rounded p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`p-2.5 rounded ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function BarList({ data, colorList }) {
  if (!data?.length) {
    return <p className="text-sm text-gray-400 py-4 text-center">No data available</p>;
  }
  const total = data.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  return (
    <div className="space-y-2.5">
      {data.slice(0, 7).map((row, i) => {
        const pct = total > 0 ? Math.round((parseFloat(row.amount || 0) / total) * 100) : 0;
        const label = row.category || row.department || 'Unknown';
        return (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700 font-medium capitalize">{label}</span>
              <span className="text-gray-500 tabular-nums">{formatCurrency(row.amount)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: colorList[i % colorList.length] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsApi.summary(month || undefined).then((r) => setSummary(r.data)).finally(() => setLoading(false));
  }, [month]);

  const totalClaims = summary?.top_spenders?.reduce((s, r) => s + parseInt(r.claim_count || 0), 0) || 0;
  const avgClaimValue = totalClaims > 0 ? summary.total_amount / totalClaims : 0;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Spend analytics across exported claims</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Filter by month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 rounded border border-gray-300 px-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
          {month && (
            <button
              onClick={() => setMonth('')}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={DollarSign}
              label="Total Spend"
              value={formatCurrency(summary?.total_amount)}
              iconBg="bg-red-50"
              iconColor="text-red-700"
            />
            <StatCard
              icon={ReceiptText}
              label="Total Claims"
              value={totalClaims}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Claim Value"
              value={formatCurrency(avgClaimValue)}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              icon={DollarSign}
              label="Total VAT"
              value={formatCurrency(summary?.total_vat)}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
            />
          </div>

          {/* Monthly trend */}
          <div className="bg-white border border-gray-200 rounded p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Spend Trend</h2>
            {summary?.monthly_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
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
                  <Bar dataKey="amount" fill="#CC1719" radius={[2, 2, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No trend data — export some batches first</p>
            )}
          </div>

          {/* Category + Department */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Spend by Category</h2>
              <BarList data={summary?.by_category} colorList={CATEGORY_COLORS} />
            </div>
            <div className="bg-white border border-gray-200 rounded p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Spend by Department</h2>
              <BarList data={summary?.by_department} colorList={['#2563EB', '#7C3AED', '#0891B2', '#16A34A', '#D97706', '#CC1719']} />
            </div>
          </div>

          {/* Top spenders */}
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Top Spenders
              </h2>
            </div>
            {summary?.top_spenders?.length > 0 ? (
              <>
                <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">#</span>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Employee</span>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-32">Department</span>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-16 text-right">Claims</span>
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28 text-right">Total Spend</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {summary.top_spenders.map((s, i) => (
                    <div key={s.name} className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-4 items-center px-5 py-3">
                      <span className="text-sm font-medium text-gray-400 tabular-nums">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{s.name}</span>
                      <span className="text-sm text-gray-500 w-32 truncate">{s.department || '—'}</span>
                      <span className="text-sm text-gray-600 w-16 text-right tabular-nums">{s.claim_count}</span>
                      <span className="text-sm font-semibold text-gray-900 w-28 text-right tabular-nums">{formatCurrency(s.amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">No spender data available</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
