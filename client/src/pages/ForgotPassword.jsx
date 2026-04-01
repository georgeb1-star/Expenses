import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import api from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="h-1 bg-red-700" />
          <div className="p-7">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-6">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>

            {submitted ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Check your email</h2>
                <p className="text-sm text-gray-500">
                  If <strong>{email}</strong> is registered, you'll receive a password reset link within a few minutes.
                </p>
                <p className="text-xs text-gray-400 mt-3">The link expires in 1 hour.</p>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Forgot your password?</h2>
                <p className="text-sm text-gray-500 mb-5">Enter your email and we'll send you a reset link.</p>

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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@citipost.co.uk"
                      autoComplete="email"
                      className="h-10"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11" disabled={loading}>
                    {loading ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>
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
