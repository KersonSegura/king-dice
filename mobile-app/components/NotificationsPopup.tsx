/**
 * Notifications popup for mobile app.
 * Shows recent notifications: level up, comments/likes, new follower, dice/card of the week.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../lib/api-client';

const FETCH_TIMEOUT_MS = 6000;

interface NotificationActor {
  id?: string;
  username?: string;
  avatar?: string | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  actor?: NotificationActor | null;
  url?: string | null;
  createdAt: string;
  read?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'level_up':
      return 'trophy';
    case 'follow':
    case 'follow_request':
      return 'person-add';
    case 'comment':
    case 'reply':
      return 'chatbubble';
    case 'like':
    case 'gallery_like':
      return 'heart';
    case 'dice_of_week':
    case 'card_of_week':
      return 'star';
    case 'message':
      return 'mail';
    default:
      return 'notifications';
  }
}

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function NotificationsPopup({ visible, onClose }: Props) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ notifications: NotificationItem[] }>(
        `/api/notifications?userId=${user.id}&limit=30&unread=false`,
        { timeout: FETCH_TIMEOUT_MS }
      );
      setItems(res.notifications || []);
    } catch (e) {
      setError('Could not load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAuthenticated]);

  useEffect(() => {
    if (visible && user?.id) {
      fetchNotifications();
    }
  }, [visible, user?.id, fetchNotifications]);

  const handleNotificationPress = (item: NotificationItem) => {
    onClose();
    if (item.url) {
      const path = item.url.startsWith('http')
        ? (() => {
            try {
              const u = new URL(item.url!);
              return u.pathname + u.search + (u.hash || '');
            } catch {
              return item.url!;
            }
          })()
        : item.url;
      router.push(`/open?path=${encodeURIComponent(path)}` as any);
    }
  };

  const handleMarkAllRead = async () => {
    if (items.length === 0) return;
    try {
      await apiClient.post('/api/notifications/mark-read', {
        ids: items.map((i) => i.id),
      });
      fetchNotifications();
    } catch {
      // Ignore
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.title}>Notifications</Text>
            <View style={styles.headerActions}>
              {items.length > 0 && (
                <TouchableOpacity onPress={handleMarkAllRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color="#1e1e1e" />
              </TouchableOpacity>
            </View>
          </View>

          {!isAuthenticated || !user ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>Sign in to see your notifications</Text>
              <Text style={styles.emptySubtext}>
                Level ups, comments, likes, new followers, and more will appear here.
              </Text>
            </View>
          ) : loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#fbae17" />
            </View>
          ) : error ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No new notifications</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, !item.read && styles.itemUnread]}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemIconWrap}>
                    {item.actor?.avatar ? (
                      <Image source={{ uri: item.actor.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.iconCircle, { backgroundColor: '#e5e7eb' }]}>
                        <Ionicons name={getNotificationIcon(item.type) as any} size={20} color="#6b7280" />
                      </View>
                    )}
                  </View>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.itemTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                  {item.url && (
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={styles.chevron} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  markAllText: {
    fontSize: 14,
    color: '#fbae17',
    fontWeight: '600',
  },
  loadingWrap: {
    padding: 40,
    alignItems: 'center',
  },
  emptyWrap: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemUnread: {
    backgroundColor: '#fffbeb',
  },
  itemIconWrap: {
    marginRight: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  itemTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
});
