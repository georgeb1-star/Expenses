import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimsApi, alertsApi, commentsApi, receiptsApi, itemsApi, templatesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ItemForm } from './ItemForm';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AlertCircle, AlertTriangle, Plus, Trash2, Upload, MessageSquare, CheckCircle2, ArrowLeft, FileText, ExternalLink, Receipt, BookmarkPlus } from 'lucide-react';
import api from '../../api/client';

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
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const isOwner = claim?.user_id === user.id;
  const isDraft = claim?.status === 'draft';
  const canEdit = isOwner && isDraft;

  const load = async () => {
    try {
      const [claimRes, alertsRes, commentsRes] = await Promise.all([
        claimsApi.get(id),
        alertsApi.list(id),
        commentsApi.list(id),
      ]);
      setClaim(claimRes.data);
      setAlerts(alertsRes.data);
      setComments(commentsRes.data);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    } finally {
      await load();
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

  const viewReceipt = async (receiptId, filename) => {
    const { data } = await api.get(`/receipts/${receiptId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleDeleteItem = async (itemId) => {
    await itemsApi.delete(id, itemId);
    setConfirmDeleteItemId(null);
    await load();
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    const items = claim?.items ?? [];
    if (!items.length) { setError('Add at least one item before saving a template.'); return; }
    setSavingTemplate(true);
    setError('');
    try {
      await templatesApi.create({ name: templateName.trim(), items });
      setTemplateSaved(true);
      setShowSaveTemplate(false);
      setTemplateName('');
      setTimeout(() => setTemplateSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save template — please try again.');
    } finally {
      setSavingTemplate(false);
    }
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
          {templateSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Template saved
            </span>
          )}
          {canEdit && allItems.length > 0 && !showSaveTemplate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setTemplateName(claim.title); setShowSaveTemplate(true); }}
            >
              <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
              Save as Template
            </Button>
          )}
          {showSaveTemplate && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false); }}
                placeholder="Template name"
                className="h-8 w-44 rounded border border-gray-300 px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
              />
              <Button size="sm" onClick={handleSaveTemplate} disabled={!templateName.trim() || savingTemplate}>
                {savingTemplate ? 'Saving…' : 'Save'}
              </Button>
              <button onClick={() => setShowSaveTemplate(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
            </div>
          )}
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

      {/* Approved — processor starts audit */}
      {claim.status === 'approved' && ['processor', 'admin'].includes(user.role) && (
        <Card>
          <CardHeader><CardTitle>Finance Audit</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              This claim has been approved by the manager. Start the audit to review receipts and compliance, then pass or fail it.
            </p>
            <Button
              size="sm"
              disabled={actionLoading}
              onClick={async () => {
                setActionLoading(true);
                setError('');
                try { await claimsApi.startAudit(id); await load(); }
                catch (err) { setError(err.response?.data?.error || 'Failed to start audit'); }
                finally { setActionLoading(false); }
              }}
            >
              {actionLoading ? 'Starting…' : 'Start Audit'}
            </Button>
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

              {/* Billing notice — shown whenever any item is billable to a client */}
              {(() => {
                const billableItems = allItems.filter((i) => i.billable && i.client_name);
                if (!billableItems.length) return null;
                const clients = [...new Set(billableItems.map((i) => i.client_name))];
                return (
                  <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md">
                    <Receipt className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Billable claim — {billableItems.length} item{billableItems.length > 1 ? 's' : ''} to be charged to client
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Client{clients.length > 1 ? 's' : ''}: {clients.join(', ')}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {allItems.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-gray-600">No expense items added yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Use "Add Expense Item" to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-100">
                        <th className="w-1 p-0" aria-hidden="true" />
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 w-[120px]">Category</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5">Description</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 w-[96px]">Date</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 w-[88px]">Payment</th>
                        <th className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 w-[60px]">Receipt</th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-2.5 pr-5 w-[96px]">Amount</th>
                        {canEdit && <th className="w-[80px] px-3 py-2.5" aria-label="Actions" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allItems.map((item, index) => {
                        const categoryKey = (() => {
                          const t = (item.expense_type || item.type || '').toLowerCase();
                          if (item.type === 'mileage') return 'mileage';
                          if (t.includes('travel') || t.includes('transport') || t.includes('rail') || t.includes('flight') || t.includes('taxi')) return 'travel';
                          if (t.includes('hotel') || t.includes('accommodat')) return 'accommodation';
                          if (t.includes('meal') || t.includes('subsist') || t.includes('food') || t.includes('lunch') || t.includes('dinner') || t.includes('breakfast')) return 'subsistence';
                          if (t.includes('entertain') || t.includes('client')) return 'entertainment';
                          if (t.includes('equip') || t.includes('hardware') || t.includes('software')) return 'equipment';
                          return 'other';
                        })();
                        const categoryStyles = {
                          travel:        { bar: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700',      label: item.expense_type || 'Travel' },
                          accommodation: { bar: 'bg-violet-500',  badge: 'bg-violet-50 text-violet-700',  label: item.expense_type || 'Accommodation' },
                          subsistence:   { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700',label: item.expense_type || 'Subsistence' },
                          entertainment: { bar: 'bg-pink-500',    badge: 'bg-pink-50 text-pink-700',      label: item.expense_type || 'Entertainment' },
                          equipment:     { bar: 'bg-orange-500',  badge: 'bg-orange-50 text-orange-700',  label: item.expense_type || 'Equipment' },
                          mileage:       { bar: 'bg-indigo-500',  badge: 'bg-indigo-50 text-indigo-700',  label: 'Mileage' },
                          other:         { bar: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600',     label: item.expense_type || 'Other' },
                        };
                        const style = categoryStyles[categoryKey];
                        const isEven = index % 2 === 0;
                        const amount = item.type === 'mileage' ? item.reimbursement_amount : item.amount;
                        const hasReceipt = item.receipts && item.receipts.length > 0;

                        return (
                          <tr key={item.id} className={`group align-top${isEven ? '' : ' bg-gray-50/60'}`}>
                            {/* Colour bar */}
                            <td className="p-0 w-1" aria-hidden="true">
                              <div className={`h-full w-1 min-h-[48px] ${style.bar}`} />
                            </td>
                            {/* Category badge */}
                            <td className="px-3 py-3 align-middle">
                              <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${style.badge}`}>
                                {style.label}
                              </span>
                            </td>
                            {/* Description */}
                            <td className="px-3 py-3 align-middle">
                              {item.supplier && <p className="text-sm font-medium text-gray-900 leading-snug">{item.supplier}</p>}
                              {item.business_purpose && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.business_purpose}</p>}
                              {item.type === 'mileage' && item.from_location && item.to_location && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.from_location} &rarr; {item.to_location}
                                  {item.distance ? ` · ${item.distance} mi` : ''}
                                  {item.vehicle_type ? ` · ${item.vehicle_type}` : ''}
                                </p>
                              )}
                              {item.billable && item.client_name && (
                                <span className="inline-block mt-1 text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  Billable — {item.client_name}
                                </span>
                              )}
                            </td>
                            {/* Date */}
                            <td className="px-3 py-3 align-middle">
                              <span className="text-sm text-gray-600 tabular-nums whitespace-nowrap">{formatDate(item.transaction_date)}</span>
                            </td>
                            {/* Payment */}
                            <td className="px-3 py-3 align-middle">
                              {item.payment_type
                                ? <span className="text-xs text-gray-500 whitespace-nowrap">{item.payment_type}</span>
                                : <span className="text-xs text-gray-300">&mdash;</span>}
                            </td>
                            {/* Receipt */}
                            <td className="px-3 py-3 align-middle text-center">
                              {item.type === 'mileage' ? (
                                <span className="text-xs text-gray-300 select-none">&mdash;</span>
                              ) : hasReceipt ? (
                                <button
                                  onClick={() => viewReceipt(item.receipts[0].id, item.receipts[0].filename)}
                                  title={item.receipts[0].filename}
                                  className="inline-flex items-center justify-center text-red-700 hover:text-red-800 transition-colors"
                                >
                                  <FileText size={15} strokeWidth={2} />
                                </button>
                              ) : (
                                <span className="inline-flex items-center justify-center text-gray-300" title="No receipt attached">
                                  <FileText size={15} strokeWidth={1.5} />
                                </span>
                              )}
                            </td>
                            {/* Amount */}
                            <td className="px-3 py-3 pr-5 align-middle text-right">
                              <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatCurrency(amount)}</p>
                              {item.vat > 0 && (
                                <p className="text-[11px] text-gray-400 tabular-nums mt-0.5">VAT {formatCurrency(item.vat)}</p>
                              )}
                            </td>
                            {/* Actions — visible on row hover only */}
                            {canEdit && (
                              <td className="px-3 py-3 align-middle text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                  <button onClick={() => setEditingItem(item)} className="text-[11px] font-medium text-red-700 hover:text-red-800 whitespace-nowrap">Edit</button>
                                  <span className="text-gray-200 select-none">|</span>
                                  <button onClick={() => setConfirmDeleteItemId(item.id)} className="text-[11px] font-medium text-gray-400 hover:text-red-600 whitespace-nowrap transition-colors">Remove</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-t-gray-300 border-b border-b-gray-100">
                        <td colSpan={canEdit ? 6 : 5} className="px-3 py-3 pl-4">
                          <span className="text-sm font-medium text-gray-600">Total claim amount</span>
                        </td>
                        <td className="px-3 py-3 pr-5 text-right">
                          <span className="text-base font-semibold text-gray-900 tabular-nums">{formatCurrency(totalAmount)}</span>
                        </td>
                        {canEdit && <td />}
                      </tr>
                    </tfoot>
                  </table>
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
                <div key={item.id} className="border border-gray-200 rounded p-4 space-y-3">
                  {/* Item summary */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.expense_type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(item.transaction_date)} · {formatCurrency(item.amount)}
                        {item.vat > 0 && <span> · VAT {formatCurrency(item.vat)}</span>}
                        {item.supplier && <span> · {item.supplier}</span>}
                      </p>
                      {item.business_purpose && (
                        <p className="text-xs text-gray-500 mt-0.5">{item.business_purpose}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {item.department && <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{item.department}</span>}
                        {item.project && <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Project: {item.project}</span>}
                        {item.payment_type && <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{item.payment_type}</span>}
                        {item.billable && <span className="text-[11px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded">Billable — {item.client_name}</span>}
                      </div>
                    </div>
                    {canEdit && (
                      <label className="cursor-pointer flex-shrink-0">
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

                  {/* Receipts for this item */}
                  {item.receipts?.length > 0 ? (
                    <div className="space-y-1.5 pt-2 border-t border-gray-100">
                      {item.receipts.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => viewReceipt(r.id, r.filename)}
                          className="flex items-center gap-2 text-sm text-red-700 hover:text-red-800 font-medium"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {r.filename}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">No receipt uploaded</p>
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
