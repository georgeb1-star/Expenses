import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, ReceiptText } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Brand panel */}
      <div className="bg-red-800 md:w-[420px] md:flex-shrink-0 flex flex-col items-center justify-center px-10 py-12 md:py-0">
        <div className="flex flex-col items-center text-center">
          <div className="w-10 h-px bg-white/30 mb-6" />
          <h1 className="text-2xl font-semibold text-white leading-snug mb-3">
            Expense Management
          </h1>
          <p className="text-sm text-red-200 leading-relaxed max-w-xs">
            Submit, track and approve business expenses — all in one place.
          </p>
        </div>

        {/* Features list — hidden on mobile */}
        <div className="hidden md:flex flex-col gap-3 mt-12 w-full max-w-xs">
          {['Submit & track expense claims', 'Manager approval workflow', 'Finance processing & export'].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-300 flex-shrink-0" />
              <span className="text-sm text-red-100">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <img
              src="/citipost-logo.png"
              alt="Citipost"
              className="h-10 w-auto mb-6"
              draggable={false}
            />
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in to your account</h2>
            <p className="text-sm text-gray-500">Enter your Citipost credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
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
                placeholder="you@citipost.co.uk"
                autoComplete="email"
                className="h-10"
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
                className="h-10"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

            <p className="text-sm text-center text-gray-500">
              No account?{' '}
              <Link to="/register" className="text-red-700 hover:text-red-800 font-medium">
                Register
              </Link>
            </p>
          </form>

          {/* Test credentials — subtle */}
          <div className="mt-8 p-3.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-500">
            <p className="font-medium text-gray-600 mb-1.5">Test accounts</p>
            <div className="space-y-1 font-mono text-gray-500">
              <p>employee@example.com</p>
              <p>manager@example.com</p>
              <p>processor@example.com</p>
            </div>
            <p className="mt-2 text-gray-400">Password: <code className="text-gray-500">password</code></p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            &copy; {new Date().getFullYear()} Citipost Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
