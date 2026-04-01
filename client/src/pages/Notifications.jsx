import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../api';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { ArrowRight, Bell, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchPage = (p) => {
    setLoading(true);
    notificationsApi.list({ page: p, limit: PAGE_SIZE })
      .then((r) => {
        setNotifications(r.data.data);
        setTotal(r.data.total);
        setPages(r.data.pages);
        setPage(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPage(1); }, []);

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    window.dispatchEvent(new CustomEvent('notifications-cleared', { detail: { unread: Math.max(0, unread.length - 1) } }));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    window.dispatchEvent(new CustomEvent('notifications-cleared', { detail: { unread: 0 } }));
  };

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread.length > 0 ? `${unread.length} unread` : 'All caught up'} · {total} total
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-red-700" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Bell className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No notifications yet.</p>
          <p className="text-sm text-gray-500 mt-1">You'll be notified when claims are submitted, approved, or updated.</p>
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden divide-y divide-gray-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.read ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}
              >
                <div className="pt-1.5 flex-shrink-0 w-4 flex justify-center">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-red-700 block" aria-label="Unread" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                    {n.claim_id && (
                      <Link
                        to={`/claims/${n.claim_id}`}
                        className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-800 font-medium"
                      >
                        View claim
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="flex-shrink-0 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">Page {page} of {pages} · {total} total</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchPage(page - 1)}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <button
                  onClick={() => fetchPage(page + 1)}
                  disabled={page === pages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
