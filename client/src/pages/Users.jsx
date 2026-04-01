import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api';
import api from '../api/client';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDate } from '../lib/utils';
import { Plus, Search, X, Eye, EyeOff, UserCog } from 'lucide-react';

const ROLES = ['employee', 'manager', 'processor', 'admin'];

const ROLE_STYLES = {
  admin:     'bg-red-100 text-red-700',
  manager:   'bg-amber-100 text-amber-700',
  processor: 'bg-purple-100 text-purple-700',
  employee:  'bg-gray-100 text-gray-600',
};

const ROLE_LABELS = {
  employee:  'Employee',
  manager:   'Manager',
  processor: 'Processor',
  admin:     'Admin',
};

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[role] || 'bg-gray-100 text-gray-600'}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

function UserModal({ user, managers, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    department: user?.department || '',
    employee_id: user?.employee_id || '',
    manager_id: user?.manager_id || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, manager_id: form.manager_id || null };
      if (isEdit) {
        const { password, ...rest } = payload;
        await usersApi.update(user.id, rest);
      } else {
        await usersApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setSaving(false);
    }
  };

  const showManager = form.role === 'employee';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-red-700" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Edit User' : 'Add User'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Full name *</label>
              <Input value={form.name} onChange={set('name')} required className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Email *</label>
              <Input type="email" value={form.email} onChange={set('email')} required className="h-9 text-sm" />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Password *</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  required
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Role *</label>
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Department</label>
              <Input value={form.department} onChange={set('department')} className="h-9 text-sm" placeholder="e.g. Operations" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Employee ID</label>
              <Input value={form.employee_id} onChange={set('employee_id')} className="h-9 text-sm" placeholder="e.g. EMP001" />
            </div>
            {showManager && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Manager</label>
                <select
                  value={form.manager_id}
                  onChange={set('manager_id')}
                  className="w-full h-9 px-2.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create User')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchUsers = async () => {
    const params = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    const res = await usersApi.list(params);
    setUsers(res.data);
  };

  useEffect(() => {
    Promise.all([
      fetchUsers(),
      api.get('/auth/managers').then((r) => setManagers(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleSaved = () => {
    setShowModal(false);
    setEditingUser(null);
    fetchUsers();
  };

  const handleDelete = async (u) => {
    setDeleteError('');
    if (!window.confirm(`Remove ${u.name}? This cannot be undone.`)) return;
    try {
      await usersApi.delete(u.id);
      fetchUsers();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Delete failed');
    }
  };

  const openEdit = (u) => { setEditingUser(u); setShowModal(true); };
  const openCreate = () => { setEditingUser(null); setShowModal(true); };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(showModal) && (
        <UserModal
          user={editingUser}
          managers={managers}
          onClose={() => { setShowModal(false); setEditingUser(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add User
        </Button>
      </div>

      {deleteError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Department</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Manager</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Joined</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-red-700">
                            {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {u.name}
                            {u.id === currentUser.id && (
                              <span className="ml-1.5 text-[10px] font-normal text-gray-400">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{u.department || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{u.manager_name || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs text-red-700 hover:text-red-800 font-medium"
                        >
                          Edit
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="text-xs text-gray-400 hover:text-red-600 font-medium transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
