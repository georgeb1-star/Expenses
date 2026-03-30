import React, { useState } from 'react';
import { itemsApi, receiptsApi, mileageApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { formatCurrency } from '../../lib/utils';
import { Sparkles, Loader2, MapPin } from 'lucide-react';

const EXPENSE_TYPES = ['Travel', 'Subsistence', 'Entertainment', 'Accommodation', 'Equipment', 'Other'];
const DEPARTMENTS = ['Sales', 'IT', 'Operations', 'Management', 'Finance', 'HR', 'Marketing', 'Logistics', 'Customer Service', 'Other'];
const VEHICLE_TYPES = ['Car', 'Motorcycle', 'Bicycle'];
const PAYMENT_TYPES = ['Company Card', 'Personal Card', 'Cash', 'Bank Transfer'];

export function ItemForm({ claimId, item, onSave, onCancel }) {
  const { user } = useAuth();
  const editing = !!item;
  const [type, setType] = useState(item?.type || 'expense');
  const [form, setForm] = useState({
    expense_type: item?.expense_type || '',
    supplier: item?.supplier || '',
    transaction_date: item?.transaction_date?.slice(0, 10) || '',
    amount: item?.amount || '',
    vat: item?.vat || '',
    currency: item?.currency || localStorage.getItem('lastCurrency') || 'GBP',
    payment_type: item?.payment_type || localStorage.getItem('lastPaymentType') || '',
    business_purpose: item?.business_purpose || '',
    department: item?.department || user?.department || '',
    project: item?.project || '',
    billable: item?.billable || false,
    client_name: item?.client_name || '',
    client_reference: item?.client_reference || '',
    from_location: item?.from_location || '',
    to_location: item?.to_location || '',
    vehicle_type: item?.vehicle_type || 'Car',
    distance: item?.distance || '',
    passengers: item?.passengers || '',
  });
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calculating, setCalculating] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleCalculateDistance = async () => {
    if (!form.from_location || !form.to_location) return;
    setCalculating(true);
    setError('');
    try {
      const { data } = await mileageApi.calculate(form.from_location, form.to_location);
      setForm((prev) => ({ ...prev, distance: String(data.miles) }));
    } catch (err) {
      setError(err.response?.data?.error || 'Distance calculation failed. Please enter manually.');
    } finally {
      setCalculating(false);
    }
  };

  const handleFileChange = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setScanned(false);
    setScanning(true);
    try {
      const { data } = await receiptsApi.analyze(selected);
      setForm((prev) => ({
        ...prev,
        supplier:         data.supplier        || prev.supplier,
        amount:           data.amount != null   ? String(data.amount)  : prev.amount,
        vat:              data.vat != null       ? String(data.vat)     : prev.vat,
        transaction_date: data.transaction_date || prev.transaction_date,
        expense_type:     data.expense_type     || prev.expense_type,
      }));
      setScanned(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Receipt scan failed — please fill in manually';
      setError(msg);
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, type };
      let savedItem;
      if (editing) {
        const { data } = await itemsApi.update(claimId, item.id, payload);
        savedItem = data;
      } else {
        const { data } = await itemsApi.create(claimId, payload);
        savedItem = data;
      }
      if (form.payment_type) localStorage.setItem('lastPaymentType', form.payment_type);
      if (form.currency) localStorage.setItem('lastCurrency', form.currency);
      if (file && !editing) {
        try {
          await receiptsApi.upload(claimId, savedItem.id, file);
        } catch {
          // Item saved — receipt upload failed. Proceed and let user upload separately.
        }
      }
      onSave(savedItem);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}

      <div className="space-y-2">
        <label className="text-sm font-medium">Item Type</label>
        <div className="flex gap-3">
          {['expense', 'mileage'].map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${type === t ? 'bg-primary text-white border-primary' : 'border-input hover:bg-muted'}`}>
              {t === 'expense' ? 'Expense' : 'Mileage'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Date *</label>
          <Input type="date" value={form.transaction_date} onChange={set('transaction_date')} required max={new Date().toISOString().slice(0, 10)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Type</label>
          <Select value={form.payment_type} onChange={set('payment_type')}>
            <option value="">Select…</option>
            {PAYMENT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
        </div>
      </div>

      {type === 'expense' ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Expense Type *</label>
              <Select value={form.expense_type} onChange={set('expense_type')} required>
                <option value="">Select…</option>
                {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier</label>
              <Input value={form.supplier} onChange={set('supplier')} placeholder="e.g. Premier Inn" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} required placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">VAT</label>
              <Input type="number" step="0.01" min="0" value={form.vat} onChange={set('vat')} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select value={form.currency} onChange={set('currency')}>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </Select>
            </div>
          </div>
          {!editing && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Receipt</label>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary/90" />
              {scanning && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scanning receipt…
                </div>
              )}
              {scanned && !scanning && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded">
                  <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                  Fields pre-filled from receipt — please review before saving
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From *</label>
              <Input value={form.from_location} onChange={set('from_location')} required placeholder="e.g. Manchester" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To *</label>
              <Input value={form.to_location} onChange={set('to_location')} required placeholder="e.g. London" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vehicle</label>
              <Select value={form.vehicle_type} onChange={set('vehicle_type')}>
                {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Distance (miles) *</label>
              <div className="flex gap-2">
                <Input type="number" step="0.1" min="0" value={form.distance} onChange={set('distance')} required />
                {form.from_location && form.to_location && (
                  <button
                    type="button"
                    onClick={handleCalculateDistance}
                    disabled={calculating}
                    title="Calculate distance from route"
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border border-input bg-white hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {calculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                    {calculating ? 'Calculating…' : 'Calculate'}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Passengers</label>
              <Input type="number" min="0" value={form.passengers} onChange={set('passengers')} />
            </div>
          </div>
          {form.distance && (
            <p className="text-sm text-muted-foreground">
              Est. reimbursement: {formatCurrency(form.distance * 0.45)} (at standard rate — actual rate calculated on save)
            </p>
          )}
        </>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Business Purpose *</label>
        <Textarea value={form.business_purpose} onChange={set('business_purpose')} required placeholder="Describe the business reason for this expense…" rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Department *</label>
          <Select value={form.department} onChange={set('department')} required>
            <option value="">Select department…</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Project{form.billable ? ' *' : ''}
          </label>
          <Input
            value={form.project}
            onChange={set('project')}
            placeholder="e.g. Q1 Campaign"
            required={form.billable}
          />
        </div>
      </div>

      {/* Billable toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="billable"
          checked={form.billable}
          onChange={(e) => setForm({ ...form, billable: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="billable" className="text-sm">Billable to client</label>
      </div>

      {/* Billing details — only shown when billable is checked */}
      {form.billable && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Billing details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client name *</label>
              <Input
                value={form.client_name}
                onChange={set('client_name')}
                placeholder="e.g. Acme Ltd"
                required={form.billable}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Client PO / Reference
                <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <Input
                value={form.client_reference}
                onChange={set('client_reference')}
                placeholder="e.g. PO-2026-0042"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Item' : 'Add Item'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
