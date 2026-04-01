import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: '', department: '', manager_id: '' });
  const [managers, setManagers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', department: user.department || '', manager_id: user.manager_id || '' });
    }
    api.get('/auth/managers').then((r) => setManagers(r.data)).catch(() => {});
  }, [user]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', form);
      setUser(data);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Update your name, department, and reporting manager.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Profile updated successfully.
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Full name</label>
            <Input value={form.name} onChange={set('name')} required />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Department</label>
            <Select value={form.department} onChange={set('department')}>
              <option value="">Select department…</option>
              {['Sales', 'IT', 'Operations', 'Management', 'Finance', 'HR', 'Marketing', 'Logistics', 'Customer Service', 'Other'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          </div>

          {user?.role === 'employee' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Reports to</label>
              <Select value={form.manager_id} onChange={set('manager_id')}>
                <option value="">No manager assigned</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}{m.department ? ` — ${m.department}` : ''}</option>
                ))}
              </Select>
              {!form.manager_id && (
                <p className="text-xs text-amber-600">You must assign a manager before you can submit claims.</p>
              )}
            </div>
          )}

          <div className="pt-1">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
