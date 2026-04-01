import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-sm text-gray-700 font-medium">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-sm text-red-700 hover:text-red-800 mt-2 inline-block">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1 bg-red-700" />
          <div className="p-7">
            {done ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Password updated</h2>
                <p className="text-sm text-gray-500">Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Set a new password</h2>
                <p className="text-sm text-gray-500 mb-5">Choose a strong password for your account.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">New password</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Confirm password</label>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="Repeat your password"
                      className="h-10"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Updating…' : 'Update password'}
                  </Button>
                </form>

                <p className="text-sm text-center text-gray-500 mt-4">
                  <Link to="/login" className="text-red-700 hover:text-red-800 font-medium">Back to sign in</Link>
                </p>
              </>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} Citipost Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
