import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../api';
import { Bell, ReceiptText, LayoutDashboard, ClipboardCheck, Landmark, Package, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary">ExpenseFlow</h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100')
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t space-y-1">
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full',
                isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100')
            }
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unread > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unread}
              </span>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
        <div className="p-4 border-t">
          <p className="text-xs font-medium text-gray-700">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
