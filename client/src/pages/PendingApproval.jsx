import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = user?.pending_role
    ? user.pending_role.charAt(0).toUpperCase() + user.pending_role.slice(1)
    : 'Elevated';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <img
          src="/citipost-logo.png"
          alt="Citipost"
          className="h-10 w-auto mx-auto mb-8"
          draggable={false}
        />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>

          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Waiting for admin approval
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-2">
            Your account has been created, but your request for{' '}
            <span className="font-medium text-gray-700">{roleLabel}</span> access
            needs to be approved by an administrator.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            You'll receive an email once a decision has been made. This usually happens within one business day.
          </p>

          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left mb-6">
            <p className="text-xs font-semibold text-amber-800 mb-1">What happens next?</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>An admin will review your role request</li>
              <li>You'll get an email when it's approved or denied</li>
              <li>Once approved, log back in to access your account</li>
            </ul>
          </div>

          <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
            Sign out
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-6">
          &copy; {new Date().getFullYear()} Citipost Ltd. All rights reserved.
        </p>
      </div>
    </div>
  );
}
