'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface NotificationItem {
  id: string;
  type: 'follow' | 'follow_request';
  title: string;
  actor?: { id: string; username: string; avatar?: string } | null;
  createdAt: string;
  status?: string;
}

export default function NotificationsBell() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}&limit=20`);
        const json = await res.json();
        if (!active) return;
        const list: NotificationItem[] = json.notifications || [];
        setItems(list);
        setUnread(list.length); // simple counter for now
      } finally {
        setLoading(false);
      }
    };
    load();

    // Realtime subscribe to follows and follow_requests
    (async () => {
      const supabase = await getSupabaseBrowserClient();
      const ch1 = supabase
        .channel(`notif-follows-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user.id}` }, (payload) => {
          const row: any = payload.new;
          setUnread((u) => u + 1);
          setItems((prev) => [{ id: `follow:${row.id}`, type: 'follow', title: 'Someone followed you', actor: null, createdAt: row.created_at }, ...prev]);
        })
        .subscribe();

      const ch2 = supabase
        .channel(`notif-requests-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follow_requests', filter: `target_id=eq.${user.id}` }, (payload) => {
          const row: any = payload.new;
          setUnread((u) => u + 1);
          setItems((prev) => [{ id: `follow_request:${row.id}`, type: 'follow_request', title: 'New follow request', actor: null, createdAt: row.created_at }, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(ch1);
        supabase.removeChannel(ch2);
      };
    })();

    return () => { active = false; };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return null;

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative p-2 rounded-full hover:bg-gray-100">
        <Bell className="w-5 h-5 text-gray-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-4 px-1.5 rounded-full min-w-[16px] text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
          <div className="px-4 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button className="text-xs text-blue-600" onClick={() => setUnread(0)}>Mark all read</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              <ul className="divide-y">
                {items.map((n) => (
                  <li key={n.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {n.actor?.avatar ? <img src={n.actor.avatar} alt={n.actor.username} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{n.title}</p>
                      <p className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


