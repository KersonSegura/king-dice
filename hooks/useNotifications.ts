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
        const res = await fetch(`/api/notifications?userId=${user.id}&limit=20`);
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
      const ch1 = supabase
        .channel(`notif-follows-${user!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follows', filter: `following_id=eq.${user!.id}` }, (payload) => {
          const row: any = payload.new;
          setUnread((u) => u + 1);
          setItems((prev) => [{ id: `follow:${row.id}`, type: 'follow', title: 'Someone followed you', actor: null, createdAt: row.created_at }, ...prev]);
        })
        .subscribe();

      const ch2 = supabase
        .channel(`notif-requests-${user!.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follow_requests', filter: `target_id=eq.${user!.id}` }, (payload) => {
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

    return () => { isActive = false; };
  }, [isAuthenticated, user]);

  const markAllRead = () => setUnread(0);

  return { items, unread, markAllRead };
}


