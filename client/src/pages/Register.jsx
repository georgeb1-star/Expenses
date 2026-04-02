import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { AlertCircle, Clock } from 'lucide-react';
import api from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee', department: '', employee_id: '', manager_id: '' });
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/managers').then((r) => setManagers(r.data)).catch(() => {});
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.role === 'employee' && !form.manager_id) {
      setError('Please select your reporting manager.');
      return;
    }
    setLoading(true);
    try {
      const user = await register({ ...form, manager_id: form.manager_id || null });
      navigate(user.pending_role ? '/pending-approval' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Brand panel */}
      <div className="bg-red-800 md:w-[360px] md:flex-shrink-0 flex flex-col items-center justify-center px-10 py-12 md:py-0">
        <div className="flex flex-col items-center text-center">
          <p className="text-3xl font-bold tracking-tight text-white mb-6">CITIPOST</p>
          <div className="w-10 h-px bg-white/30 mb-6" />
          <h1 className="text-2xl font-semibold text-white leading-snug mb-3">
            Expense Management
          </h1>
          <p className="text-sm text-red-200 leading-relaxed max-w-xs">
            Create your account to start submitting and tracking expense claims.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-start justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <img
              src="/citipost-logo.png"
              alt="Citipost"
              className="h-10 w-auto mb-6"
              draggable={false}
            />
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Create your account</h2>
            <p className="text-sm text-gray-500">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Personal info */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal information</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Full name</label>
                  <Input value={form.name} onChange={set('name')} required placeholder="Jane Smith" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Email address</label>
                  <Input type="email" value={form.email} onChange={set('email')} required placeholder="jane@citipost.co.uk" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Password</label>
                  <Input type="password" value={form.password} onChange={set('password')} required minLength={8} placeholder="At least 8 characters" className="h-10" />
                </div>
              </div>
            </div>

            {/* Work info */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Work information</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Role</label>
                    <Select value={form.role} onChange={set('role')}>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="processor">Processor</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Employee ID</label>
                    <Input value={form.employee_id} onChange={set('employee_id')} placeholder="EMP001" className="h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Department</label>
                  <Input value={form.department} onChange={set('department')} placeholder="Sales" className="h-10" />
                </div>
              </div>
            </div>

            {/* Pending approval notice for elevated roles */}
            {(form.role === 'manager' || form.role === 'processor') && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-lg">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{form.role.charAt(0).toUpperCase() + form.role.slice(1)}</strong> accounts require admin approval before you can access the system. You'll be notified by email once reviewed.
                </span>
              </div>
            )}

            {/* Manager assignment */}
            {form.role === 'employee' && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reporting line</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Reports to <span className="text-red-600">*</span></label>
                  <Select value={form.manager_id} onChange={set('manager_id')} required>
                    <option value="">Select manager…</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}{m.department ? ` — ${m.department}` : ''}</option>
                    ))}
                  </Select>
                  {managers.length === 0 && (
                    <p className="text-xs text-amber-600">No managers found. A manager account must be created first.</p>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="text-sm text-center text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-red-700 hover:text-red-800 font-medium">
                Sign in
              </Link>
            </p>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            &copy; {new Date().getFullYear()} Citipost Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
