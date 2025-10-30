'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export interface NotificationItem {
  id: string;
  type: 'follow' | 'follow_request';
  title: string;
  actor?: { id: string; username: string; avatar?: string } | null;
  createdAt: string;
  status?: string;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let isActive = true;

    const load = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}&limit=20&unread=true`);
        const json = await res.json();
        if (!isActive) return;
        const list: NotificationItem[] = json.notifications || [];
        setItems(list);
        setUnread(list.length);
      } catch {}
    };
    load();

    (async () => {
      const supabase = await getSupabaseBrowserClient();
      const ch = supabase
        .channel(`notif-${user!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user!.id}` }, (payload) => {
          const row: any = payload.new;
          setUnread((u) => u + 1);
          setItems((prev) => [{ id: row.id, type: row.type, title: row.message || 'New notification', actor: null, createdAt: row.created_at }, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(ch); };
    })();

    // Listen to local dev test events to bump badge immediately
    const onDevTest = () => setUnread((u) => u + 1);
    window.addEventListener('kd-notif-test', onDevTest);

    return () => { isActive = false; window.removeEventListener('kd-notif-test', onDevTest); };
  }, [isAuthenticated, user]);

  const markAllRead = async () => {
    try {
      if (items.length === 0) return;
      await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: items.map(i => i.id) }) });
    } finally {
      setItems([]);
      setUnread(0);
    }
  };

  const markOneRead = async (id: string) => {
    try { await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) }); } catch {}
    setItems((prev) => prev.filter(i => i.id !== id));
    setUnread((u) => Math.max(0, u - 1));
  };

  return { items, unread, markAllRead, markOneRead };
}


