import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api';
import { Bell, ReceiptText, LayoutDashboard, ClipboardCheck, Landmark, Package, LogOut, ChevronRight, UserCog } from 'lucide-react';
import { cn } from '../lib/utils';

const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  processor: 'Finance Processor',
  admin: 'Administrator',
};

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    notificationsApi.list().then((r) => {
      setUnread(r.data.filter((n) => !n.read).length);
    }).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['employee', 'manager', 'processor', 'admin'] },
    { to: '/claims', icon: ReceiptText, label: 'My Claims', roles: ['employee', 'manager', 'admin'] },
    { to: '/approvals', icon: ClipboardCheck, label: 'Approvals', roles: ['manager', 'admin'] },
    { to: '/finance', icon: Landmark, label: 'Finance', roles: ['processor', 'admin'] },
    { to: '/batches', icon: Package, label: 'Batches', roles: ['processor', 'admin'] },
  ].filter((item) => item.roles.includes(user?.role));

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-red-700 flex items-center justify-center flex-shrink-0">
              <ReceiptText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 tracking-tight">ExpenseFlow</span>
          </div>
        </div>

        {/* Primary navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors',
                    isActive
                      ? 'bg-red-50 text-red-700 font-medium'
                      : 'text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Secondary navigation */}
          <div className="mt-6 pt-4 border-t border-gray-100 space-y-0.5">
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors w-full',
                  isActive
                    ? 'bg-red-50 text-red-700 font-medium'
                    : 'text-gray-600 font-normal hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-700 text-white text-[10px] font-semibold rounded px-1.5 py-0.5 leading-none">
                  {unread}
                </span>
              )}
            </NavLink>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 p-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn('flex items-center gap-2 px-3 py-1.5 rounded text-xs mb-1 transition-colors',
                isActive ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')
            }
          >
            <UserCog className="w-3.5 h-3.5 flex-shrink-0" />
            Profile &amp; Settings
          </NavLink>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-gray-50 group">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-red-700">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-screen-xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
