import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimsApi, alertsApi, commentsApi, receiptsApi, itemsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ItemForm } from './ItemForm';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AlertCircle, AlertTriangle, Plus, Trash2, Upload, MessageSquare, CheckCircle2, ArrowLeft } from 'lucide-react';

const TABS = ['Details', 'Alerts', 'Comments', 'Receipts'];

export default function ClaimDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Details');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [comment, setComment] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState(null);

  const isOwner = claim?.user_id === user.id;
  const isDraft = claim?.status === 'draft';
  const canEdit = isOwner && isDraft;

  const load = async () => {
    const [claimRes, alertsRes, commentsRes] = await Promise.all([
      claimsApi.get(id),
      alertsApi.list(id),
      commentsApi.list(id),
    ]);
    setClaim(claimRes.data);
    setAlerts(alertsRes.data);
    setComments(commentsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleSubmit = async () => {
    setActionLoading(true);
    setError('');
    try {
      await claimsApi.submit(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Submit failed');
      if (err.response?.data?.alerts) setAlerts(err.response.data.alerts);
      setTab('Alerts');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (action, requireComment = false) => {
    if (requireComment && !actionComment.trim()) { setError('A comment is required for this action.'); return; }
    setActionLoading(true);
    setError('');
    try {
      await action({ comment: actionComment });
      setActionComment('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const { data } = await commentsApi.create(id, { message: comment });
    setComments([...comments, data]);
    setComment('');
  };

  const handleDelete = async () => {
    await claimsApi.delete(id);
    navigate('/claims');
  };

  const handleResolveAlert = async (alertId) => {
    await alertsApi.resolve(alertId);
    setAlerts(alerts.map((a) => a.id === alertId ? { ...a, resolved: true } : a));
  };

  const handleReceiptUpload = async (itemId, file) => {
    await receiptsApi.upload(id, itemId, file);
    await load();
  };

  const handleDeleteItem = async (itemId) => {
    await itemsApi.delete(id, itemId);
    setConfirmDeleteItemId(null);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
      </div>
    );
  }

  const unresolvedErrors = alerts.filter((a) => !a.resolved && a.severity === 'error');
  const unresolvedWarnings = alerts.filter((a) => !a.resolved && a.severity === 'warning');
  const allItems = claim.items || [];
  const totalAmount = allItems.reduce(
    (sum, item) => sum + parseFloat(item.type === 'mileage' ? item.reimbursement_amount || 0 : item.amount || 0),
    0
  );
  const activeAlertCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="space-y-5">
      {confirmDelete && (
        <ConfirmModal
          title="Delete claim"
          message="Permanently delete this claim? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmDeleteItemId && (
        <ConfirmModal
          title="Remove item"
          message="Remove this expense item from the claim?"
          confirmLabel="Remove"
          danger
          onConfirm={() => handleDeleteItem(confirmDeleteItemId)}
          onCancel={() => setConfirmDeleteItemId(null)}
        />
      )}

      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{claim.title}</h1>
            <StatusBadge status={claim.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {claim.owner_name}
            {claim.owner_department && <span> · {claim.owner_department}</span>}
            <span> · Created {formatDate(claim.created_at)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Status timeline */}
      <Card>
        <CardContent className="py-4">
          <StatusTimeline status={claim.status} />
        </CardContent>
      </Card>

      {/* Alert summary banners */}
      {(unresolvedErrors.length > 0 || unresolvedWarnings.length > 0) && (
        <div className="flex gap-2">
          {unresolvedErrors.length > 0 && (
            <button
              onClick={() => setTab('Alerts')}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 hover:bg-red-100 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {unresolvedErrors.length} unresolved error{unresolvedErrors.length > 1 ? 's' : ''}
            </button>
          )}
          {unresolvedWarnings.length > 0 && (
            <button
              onClick={() => setTab('Alerts')}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {unresolvedWarnings.length} warning{unresolvedWarnings.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Global error message */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Manager approval action panel */}
      {claim.status === 'manager_review' && ['manager', 'admin'].includes(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle>Manager Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Review the claim details before approving or sending back to the employee.
              A comment is required when sending back.
            </p>
            <Textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="Add a comment (required when sending back)…"
              rows={2}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(() => claimsApi.approve(id, { comment: actionComment }))}
                disabled={actionLoading}
              >
                Approve Claim
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleAction(() => claimsApi.reject(id, { comment: actionComment }), true)}
                disabled={actionLoading}
              >
                Send Back to Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Finance / audit action panel */}
      {claim.status === 'audit' && ['processor', 'admin'].includes(user.role) && (
        <Card>
          <CardHeader>
            <CardTitle>Finance Audit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              Review receipts and compliance before passing or failing this audit.
              A comment is required when failing.
            </p>
            <Textarea
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              placeholder="Add a comment (required when failing)…"
              rows={2}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAction(() => claimsApi.auditApprove(id, { comment: actionComment }))}
                disabled={actionLoading}
              >
                Pass Audit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleAction(() => claimsApi.auditReject(id, { comment: actionComment }), true)}
                disabled={actionLoading}
              >
                Fail Audit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content tabs */}
      <Card>
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 px-5">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-red-700 text-red-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
              {t === 'Alerts' && activeAlertCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-red-600 text-white text-[10px] font-semibold rounded-full">
                  {activeAlertCount}
                </span>
              )}
              {t === 'Comments' && comments.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400 font-normal">({comments.length})</span>
              )}
            </button>
          ))}
        </div>

        <CardContent>
          {/* Details Tab */}
          {tab === 'Details' && (
            <div className="space-y-4">
              {canEdit && !showItemForm && !editingItem && (
                <div>
                  <Button variant="outline" size="sm" onClick={() => setShowItemForm(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Expense Item
                  </Button>
                </div>
              )}

              {showItemForm && (
                <div className="border border-gray-200 rounded p-5 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">New Expense Item</h3>
                  <ItemForm
                    claimId={id}
                    onSave={() => { setShowItemForm(false); load(); }}
                    onCancel={() => setShowItemForm(false)}
                  />
                </div>
              )}

              {editingItem && (
                <div className="border border-gray-200 rounded p-5 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Edit Expense Item</h3>
                  <ItemForm
                    claimId={id}
                    item={editingItem}
                    onSave={() => { setEditingItem(null); load(); }}
                    onCancel={() => setEditingItem(null)}
                  />
                </div>
              )}

              {allItems.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  No items added yet. Use "Add Expense Item" to get started.
                </p>
              ) : (
                <div>
                  {/* Items table header */}
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-2 border-b border-gray-100 mb-1">
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Item</span>
                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-20 text-right">Amount</span>
                    {canEdit && <span className="w-20" />}
                  </div>

                  <div className="space-y-0 divide-y divide-gray-100">
                    {allItems.map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-3.5">
                        {/* Item description */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium uppercase tracking-wide">
                              {item.type}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {item.expense_type || item.type}
                            </span>
                            {item.supplier && (
                              <span className="text-sm text-gray-500">— {item.supplier}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                            <span>{formatDate(item.transaction_date)}</span>
                            {item.business_purpose && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span>{item.business_purpose}</span>
                              </>
                            )}
                          </div>
                          {item.type === 'mileage' && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.from_location} → {item.to_location} · {item.distance} miles
                            </p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right w-20">
                          <p className="text-sm font-semibold text-gray-900 tabular-nums">
                            {item.type === 'mileage'
                              ? formatCurrency(item.reimbursement_amount)
                              : formatCurrency(item.amount)}
                          </p>
                          {item.vat > 0 && (
                            <p className="text-[11px] text-gray-400 tabular-nums">
                              VAT {formatCurrency(item.vat)}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        {canEdit && (
                          <div className="flex items-center gap-2 w-20 justify-end">
                            <button
                              onClick={() => setEditingItem(item)}
                              className="text-xs text-red-700 hover:text-red-800 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDeleteItemId(item.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total row */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700">Total claim amount</span>
                    <span className="text-lg font-semibold text-gray-900 tabular-nums">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit button */}
              {canEdit && allItems.length > 0 && !showItemForm && !editingItem && (
                <div className="pt-4 border-t border-gray-100">
                  <Button onClick={handleSubmit} disabled={actionLoading}>
                    {actionLoading ? 'Submitting…' : 'Submit Claim for Approval'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Once submitted, the claim will be sent to your manager for review.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {tab === 'Alerts' && (
            <div className="space-y-2.5">
              {alerts.length === 0 && (
                <p className="text-sm text-gray-500 py-4">No alerts on this claim.</p>
              )}
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-3.5 rounded border ${
                    alert.resolved
                      ? 'opacity-50 bg-gray-50 border-gray-200'
                      : alert.severity === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {alert.severity === 'error'
                      ? <AlertCircle className="w-4 h-4 text-red-500" />
                      : <AlertTriangle className="w-4 h-4 text-amber-500" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">
                      {alert.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {alert.resolved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : isOwner ? (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-xs text-red-700 hover:text-red-800 font-medium flex-shrink-0"
                    >
                      Resolve
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Comments Tab */}
          {tab === 'Comments' && (
            <div className="space-y-5">
              <div className="space-y-4">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-500 py-2">No comments yet.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[11px] font-semibold text-red-700">
                        {c.user_name?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">{c.user_name}</span>
                        <span className="text-[11px] text-gray-500 capitalize px-1.5 py-0.5 bg-gray-100 rounded font-medium">
                          {c.user_role}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {c.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <form onSubmit={handleComment} className="flex gap-2 pt-3 border-t border-gray-100">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!comment.trim()}
                  className="self-end"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </form>
            </div>
          )}

          {/* Receipts Tab */}
          {tab === 'Receipts' && (
            <div className="space-y-3">
              {allItems.filter((i) => i.type === 'expense').length === 0 && (
                <p className="text-sm text-gray-500 py-4">No expense items on this claim.</p>
              )}
              {allItems.filter((i) => i.type === 'expense').map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.expense_type}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(item.transaction_date)} · {formatCurrency(item.amount)}
                    </p>
                  </div>
                  {canEdit && (
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center gap-1.5 text-sm text-red-700 hover:text-red-800 font-medium">
                        <Upload className="w-3.5 h-3.5" />
                        Upload receipt
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleReceiptUpload(item.id, e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit trail */}
      {claim.audit_log?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {claim.audit_log.map((log) => (
                <div key={log.id} className="flex items-center gap-4 py-2.5">
                  <span className="text-xs text-gray-400 w-28 flex-shrink-0 tabular-nums">
                    {formatDate(log.created_at)}
                  </span>
                  <span className="text-sm font-medium text-gray-900 w-32 flex-shrink-0 truncate">
                    {log.user_name}
                  </span>
                  <span className="text-sm text-gray-600 capitalize">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
