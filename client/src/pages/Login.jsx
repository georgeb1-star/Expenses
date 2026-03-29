import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ReceiptText, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mb-3">
            <ReceiptText className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">ExpenseFlow</h1>
          <p className="text-sm text-gray-500 mt-0.5">Enterprise expense management</p>
        </div>

        {/* Login card */}
        <div className="bg-white border border-gray-200 rounded-lg p-7 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Email address</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="you@company.com"
                autoComplete="email"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Password</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-9"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-sm text-center text-gray-500">
              No account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Register
              </Link>
            </p>
          </form>
        </div>

        {/* Dev credentials hint */}
        <div className="mt-5 p-4 bg-white border border-gray-200 rounded text-xs text-gray-500">
          <p className="font-medium text-gray-700 mb-1.5">Test accounts</p>
          <div className="space-y-1 font-mono">
            <p>employee@example.com</p>
            <p>manager@example.com</p>
            <p>processor@example.com</p>
          </div>
          <p className="mt-2 text-gray-400">Password: <code className="text-gray-600">password</code></p>
        </div>
      </div>
    </div>
  );
}
