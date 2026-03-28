import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { claimsApi, alertsApi, commentsApi, receiptsApi, itemsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/StatusBadge';
import { StatusTimeline } from '../../components/StatusTimeline';
import { ItemForm } from './ItemForm';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AlertCircle, AlertTriangle, Plus, Trash2, Upload, Eye, MessageSquare, CheckCircle2 } from 'lucide-react';

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
    if (requireComment && !actionComment.trim()) { setError('A comment is required'); return; }
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
    if (!confirm('Delete this claim?')) return;
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
    if (!confirm('Remove this item?')) return;
    await itemsApi.delete(id, itemId);
    await load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  const unresolvedErrors = alerts.filter((a) => !a.resolved && a.severity === 'error');
  const unresolvedWarnings = alerts.filter((a) => !a.resolved && a.severity === 'warning');

  // All receipts across items
  const allItems = claim.items || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{claim.title}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{claim.owner_name}</span>
            <span>·</span>
            <span>{claim.owner_department}</span>
            <span>·</span>
            <span>Created {formatDate(claim.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={claim.status} />
          {canEdit && (
            <Button variant="destructive" size="sm" onClick={handleDelete}><Trash2 className="w-4 h-4" /></Button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <Card><CardContent className="p-4"><StatusTimeline status={claim.status} /></CardContent></Card>

      {/* Alert summary */}
      {(unresolvedErrors.length > 0 || unresolvedWarnings.length > 0) && (
        <div className="flex gap-3">
          {unresolvedErrors.length > 0 && (
            <button onClick={() => setTab('Alerts')} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 hover:bg-red-100">
              <AlertCircle className="w-4 h-4" /> {unresolvedErrors.length} error{unresolvedErrors.length > 1 ? 's' : ''}
            </button>
          )}
          {unresolvedWarnings.length > 0 && (
            <button onClick={() => setTab('Alerts')} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 hover:bg-yellow-100">
              <AlertTriangle className="w-4 h-4" /> {unresolvedWarnings.length} warning{unresolvedWarnings.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}

      {/* Action area */}
      {(claim.status === 'manager_review' && ['manager', 'admin'].includes(user.role)) && (
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-medium text-sm">Manager Action</p>
          <Textarea value={actionComment} onChange={(e) => setActionComment(e.target.value)} placeholder="Add a comment (required to reject)…" rows={2} />
          <div className="flex gap-2">
            <Button onClick={() => handleAction(() => claimsApi.approve(id, { comment: actionComment }))} disabled={actionLoading}>Approve</Button>
            <Button variant="destructive" onClick={() => handleAction(() => claimsApi.reject(id, { comment: actionComment }), true)} disabled={actionLoading}>Send Back</Button>
          </div>
        </CardContent></Card>
      )}

      {(claim.status === 'audit' && ['processor', 'admin'].includes(user.role)) && (
        <Card><CardContent className="p-4 space-y-3">
          <p className="font-medium text-sm">Finance / Audit Action</p>
          <Textarea value={actionComment} onChange={(e) => setActionComment(e.target.value)} placeholder="Add a comment (required to reject)…" rows={2} />
          <div className="flex gap-2">
            <Button onClick={() => handleAction(() => claimsApi.auditApprove(id, { comment: actionComment }))} disabled={actionLoading}>Pass Audit</Button>
            <Button variant="destructive" onClick={() => handleAction(() => claimsApi.auditReject(id, { comment: actionComment }), true)} disabled={actionLoading}>Fail Audit</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Tabs */}
      <Card>
        <div className="border-b px-6">
          <div className="flex gap-6">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t}
                {t === 'Alerts' && alerts.filter(a => !a.resolved).length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{alerts.filter(a => !a.resolved).length}</span>
                )}
                {t === 'Comments' && comments.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">({comments.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {/* Details Tab */}
          {tab === 'Details' && (
            <div className="space-y-4">
              {canEdit && !showItemForm && (
                <Button variant="outline" size="sm" onClick={() => setShowItemForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              )}
              {showItemForm && (
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-4">New Item</h3>
                  <ItemForm claimId={id} onSave={() => { setShowItemForm(false); load(); }} onCancel={() => setShowItemForm(false)} />
                </div>
              )}
              {editingItem && (
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-4">Edit Item</h3>
                  <ItemForm claimId={id} item={editingItem} onSave={() => { setEditingItem(null); load(); }} onCancel={() => setEditingItem(null)} />
                </div>
              )}
              {allItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No items yet.</p>
              ) : (
                <div className="space-y-3">
                  {allItems.map((item) => (
                    <div key={item.id} className="flex items-start justify-between p-4 border rounded-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 font-medium">{item.type}</span>
                          <span className="text-sm font-medium">{item.expense_type || item.type}</span>
                          {item.supplier && <span className="text-xs text-muted-foreground">· {item.supplier}</span>}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {formatDate(item.transaction_date)}
                          {item.business_purpose && ` · ${item.business_purpose}`}
                        </div>
                        {item.type === 'mileage' && (
                          <p className="text-xs text-muted-foreground mt-1">{item.from_location} → {item.to_location} · {item.distance} miles</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-semibold">
                          {item.type === 'mileage' ? formatCurrency(item.reimbursement_amount) : formatCurrency(item.amount)}
                        </p>
                        {item.vat > 0 && <p className="text-xs text-muted-foreground">VAT: {formatCurrency(item.vat)}</p>}
                        {canEdit && (
                          <div className="flex gap-1 mt-2 justify-end">
                            <button onClick={() => setEditingItem(item)} className="text-xs text-primary hover:underline">Edit</button>
                            <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-destructive hover:underline ml-2">Remove</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Total */}
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(allItems.reduce((sum, item) => sum + parseFloat(item.type === 'mileage' ? item.reimbursement_amount || 0 : item.amount || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Submit button */}
              {canEdit && allItems.length > 0 && (
                <div className="pt-4 border-t">
                  <Button onClick={handleSubmit} disabled={actionLoading}>
                    {actionLoading ? 'Submitting…' : 'Submit Claim'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {tab === 'Alerts' && (
            <div className="space-y-3">
              {alerts.length === 0 && <p className="text-muted-foreground text-sm">No alerts.</p>}
              {alerts.map((alert) => (
                <div key={alert.id} className={`flex items-start justify-between p-3 rounded-md border ${alert.resolved ? 'opacity-50' : alert.severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-start gap-2">
                    {alert.severity === 'error' ? <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground capitalize">{alert.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {!alert.resolved && isOwner && (
                    <button onClick={() => handleResolveAlert(alert.id)} className="text-xs text-primary hover:underline flex-shrink-0 ml-2">Resolve</button>
                  )}
                  {alert.resolved && <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}

          {/* Comments Tab */}
          {tab === 'Comments' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {comments.length === 0 && <p className="text-muted-foreground text-sm">No comments yet.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-primary">{c.user_name?.charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.user_name}</span>
                        <span className="text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-gray-100 rounded">{c.user_role}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{c.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleComment} className="flex gap-2 pt-3 border-t">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" rows={2} className="flex-1" />
                <Button type="submit" size="sm" disabled={!comment.trim()}><MessageSquare className="w-4 h-4" /></Button>
              </form>
            </div>
          )}

          {/* Receipts Tab */}
          {tab === 'Receipts' && (
            <div className="space-y-4">
              {allItems.filter((i) => i.type === 'expense').length === 0 && (
                <p className="text-muted-foreground text-sm">No expense items.</p>
              )}
              {allItems.filter((i) => i.type === 'expense').map((item) => (
                <div key={item.id} className="border rounded-md p-4">
                  <p className="text-sm font-medium mb-3">{item.expense_type} · {formatDate(item.transaction_date)} · {formatCurrency(item.amount)}</p>
                  {canEdit && (
                    <label className="cursor-pointer">
                      <span className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="w-4 h-4" /> Upload receipt
                      </span>
                      <input type="file" accept="image/*,.pdf" className="hidden"
                        onChange={(e) => handleReceiptUpload(item.id, e.target.files[0])} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      {claim.audit_log?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Audit Trail</CardTitle></CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {claim.audit_log.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground text-xs w-32 flex-shrink-0">{formatDate(log.created_at)}</span>
                  <span className="font-medium">{log.user_name}</span>
                  <span className="text-muted-foreground capitalize">{log.action.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
