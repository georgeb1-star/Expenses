import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api';
import { Bell, ReceiptText, LayoutDashboard, ClipboardCheck, Landmark, Package, LogOut, ChevronRight, UserCog, BarChart2, Users } from 'lucide-react';
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
    const fetchUnread = () => {
      notificationsApi.list().then((r) => {
        setUnread(r.data.filter((n) => !n.read).length);
      }).catch(() => {});
    };
    fetchUnread();
    window.addEventListener('notifications-cleared', fetchUnread);
    return () => window.removeEventListener('notifications-cleared', fetchUnread);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['employee', 'manager', 'processor', 'admin'] },
    { to: '/claims', icon: ReceiptText, label: 'My Claims', roles: ['employee', 'manager', 'admin'] },
    { to: '/approvals', icon: ClipboardCheck, label: 'Approvals', roles: ['manager', 'admin'] },
    { to: '/finance', icon: Landmark, label: 'Finance', roles: ['processor', 'admin'] },
    { to: '/batches', icon: Package, label: 'Batches', roles: ['processor', 'admin'] },
    { to: '/reports', icon: BarChart2, label: 'Reports', roles: ['processor', 'admin', 'manager'] },
    { to: '/users', icon: Users, label: 'User Management', roles: ['admin'] },
  ].filter((item) => item.roles.includes(user?.role));

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-950 flex flex-col flex-shrink-0">
        {/* Brand */}
        <div className="h-14 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-700 flex items-center justify-center flex-shrink-0">
              <ReceiptText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">ExpenseFlow</span>
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
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-gray-400 font-normal hover:bg-white/5 hover:text-gray-200'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Secondary navigation */}
          <div className="mt-6 pt-4 border-t border-white/10 space-y-0.5">
            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full',
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-gray-400 font-normal hover:bg-white/5 hover:text-gray-200'
                )
              }
            >
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-700 text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 leading-none">
                  {unread}
                </span>
              )}
            </NavLink>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mb-1 transition-colors',
                isActive ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200')
            }
          >
            <UserCog className="w-3.5 h-3.5 flex-shrink-0" />
            Profile &amp; Settings
          </NavLink>
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 group">
            <div className="w-7 h-7 rounded-full bg-red-900 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold text-red-300">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{ROLE_LABELS[user?.role] || user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-screen-xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
