import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { Bell } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsApi.list().then((r) => setNotifications(r.data)).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : notifications.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No notifications yet.</CardContent></Card>
      ) : (
        <Card>
          <div className="divide-y">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start gap-4 p-4 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{formatDate(n.created_at)}</span>
                    {n.claim_id && (
                      <Link to={`/claims/${n.claim_id}`} className="text-xs text-primary hover:underline">View claim</Link>
                    )}
                  </div>
                </div>
                {!n.read && (
                  <button onClick={() => markRead(n.id)} className="text-xs text-muted-foreground hover:text-foreground">Dismiss</button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
