/**
 * Bottom navigation bar with 5 actions:
 * Home, Feed, Chat, Search, Profile (opens profile menu).
 * Profile menu matches website Header's user dropdown exactly.
 * Always visible (does not hide on scroll).
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Image, Text, ActivityIndicator, PanResponder } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import SvgIcon from './SvgIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTabRefresh } from '../contexts/TabRefreshContext';
import { useChatUnread } from '../contexts/ChatUnreadContext';
import { apiClient } from '../lib/api-client';
import { API_BASE_URL } from '../config/api';

/** Exported so chat (and other tabs) can add padding to avoid content behind the nav bar. */
export const BOTTOM_NAV_BASE_HEIGHT = 76;
const NAV_HEIGHT = BOTTOM_NAV_BASE_HEIGHT;

const NAV_ICON_SIZE = 28;
const AVATAR_BTN_SIZE = 44;
const FEED_ICON_SIZE = 24;
const CHAT_ICON_SIZE = 36;

const baseUrl = () => API_BASE_URL.replace(/\/$/, '');

/** Resolve avatar to full URI. Uses same fallback as website Header: DefaultDiceAvatar. */
function resolveAvatarUri(avatar: string | null | undefined): string {
  const value = avatar || '/DefaultDiceAvatar.svg';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const base = baseUrl();
  return value.startsWith('/') ? `${base}${value}` : `${base}/${value}`;
}

/** Renders avatar - uses WebView with img tag (same as website Header) for correct SVG/raster display. */
function AvatarImage({
  uri,
  size,
  style,
  onError,
}: {
  uri: string;
  size: number;
  style?: object;
  onError?: () => void;
}) {
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const hasReportedError = useRef(false);

  useEffect(() => {
    hasReportedError.current = false;
  }, [uri]);

  const escapedUri = uri.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>*{margin:0;padding:0}body{display:flex;align-items:center;justify-content:center;background:transparent}img{width:100%;height:100%;object-fit:cover;border-radius:50%}</style></head><body><img src="${escapedUri}" onerror="window.ReactNativeWebView?.postMessage(JSON.stringify({type:'error'}))"/></body></html>`;

  const handleMessage = (e: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.type === 'error' && !hasReportedError.current) {
        hasReportedError.current = true;
        onErrorRef.current?.();
      }
    } catch {}
  };

  return (
    <View style={[style, { width: size, height: size, overflow: 'hidden', borderRadius: size / 2, backgroundColor: '#fff' }]}>
      <WebView
        source={{ html }}
        style={{ width: size, height: size, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        pointerEvents="none"
        originWhitelist={['*']}
        mixedContentMode="always"
        onMessage={handleMessage}
      />
    </View>
  );
}

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useLocale();
  const { requestRefresh } = useTabRefresh();
  const { user, logout, isLoading } = useAuth();
  const { unreadCount: unreadChatCount } = useChatUnread();
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [chatIconState, setChatIconState] = useState<'chat' | 'bot'>('chat');
  const [userStats, setUserStats] = useState({ level: 1, posts: 0 });

  const logoUri = `${baseUrl()}/Logo.png`;
  const avatarUri = user ? resolveAvatarUri(user.avatar) : null;
  const showAvatarImage = !!user && !!avatarUri && !avatarError;
  const isOnChatTab = pathname === '/(tabs)/chat' || pathname?.startsWith('/(tabs)/chat');

  useEffect(() => {
    setAvatarError(false);
  }, [user?.id, user?.avatar ?? '']);

  // Fetch user stats when profile modal opens (same as website Header)
  useEffect(() => {
    if (!profileOpen || !user?.id) return;
    const fetchStats = async () => {
      try {
        const [repRes, statsRes] = await Promise.all([
          apiClient.get<{ user?: { level?: number } }>(`/api/reputation?userId=${user.id}`),
          apiClient.get<{ success?: boolean; stats?: { forumDiscussions?: number; galleryPosts?: number } }>(`/api/users/stats?userId=${user.id}`),
        ]);
        const level = repRes.user?.level ?? 1;
        const posts = (statsRes.stats?.forumDiscussions ?? 0) + (statsRes.stats?.galleryPosts ?? 0);
        setUserStats({ level, posts });
      } catch {
        setUserStats({ level: 1, posts: 0 });
      }
    };
    fetchStats();
  }, [profileOpen, user?.id]);

  // Chat icon alternates ChatIcon ↔ DiceBotSmallYellow every 2s (same as floating chat), except when on chat tab
  useEffect(() => {
    if (isOnChatTab) {
      setChatIconState('chat');
      return;
    }
    const interval = setInterval(() => {
      setChatIconState((prev) => (prev === 'chat' ? 'bot' : 'chat'));
    }, 2000);
    return () => clearInterval(interval);
  }, [isOnChatTab]);


  const closeProfile = () => setProfileOpen(false);

  const profilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_: unknown, { dy }: { dy: number }) => Math.abs(dy) > 5,
      onPanResponderRelease: (_: unknown, { dy }: { dy: number }) => {
        if (dy > 60) closeProfile();
      },
    })
  ).current;

  const items = [
    {
      key: 'home',
      icon: <Image source={{ uri: logoUri }} style={styles.logo} />,
      href: '/(tabs)',
    },
    { key: 'feed', icon: <SvgIcon name="CommunityFeedGray" size={FEED_ICON_SIZE} fallback="Community" />, href: '/(tabs)/feed' },
    {
      key: 'chat',
      icon: (
        <View>
          <SvgIcon name={chatIconState === 'chat' ? 'ChatGray' : 'DiceBotSmallGray'} size={CHAT_ICON_SIZE} />
          {unreadChatCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </Text>
            </View>
          )}
        </View>
      ),
      href: '/(tabs)/chat',
    },
    { key: 'shop', icon: <SvgIcon name="ShopGray" size={NAV_ICON_SIZE} />, href: '/shop' },
  ];

  const isActive = (href: string) => {
    if (href === '/(tabs)') return pathname === '/' || pathname === '/(tabs)';
    if (href === '/(tabs)/feed') return pathname === '/feed' || pathname?.startsWith(href);
    if (href === '/(tabs)/chat') return pathname === '/chat' || pathname?.startsWith(href);
    return pathname?.startsWith(href);
  };

  const handleNavPress = (href: string) => {
    if (isActive(href)) {
      requestRefresh(href);
    } else {
      router.replace(href as any);
    }
  };

  return (
    <>
      <View style={[styles.container, { paddingBottom: 12 + insets.bottom, height: NAV_HEIGHT + insets.bottom }]}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.item, isActive(item.href) && styles.itemActive]}
            onPress={() => handleNavPress(item.href)}
          >
            <View style={{ opacity: 1 }}>{item.icon}</View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.item} onPress={() => setProfileOpen(true)}>
          <View style={[styles.avatarBtn, { opacity: 1 }]}>
            {showAvatarImage ? (
              <AvatarImage
                uri={avatarUri!}
                size={AVATAR_BTN_SIZE}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <SvgIcon name="DefaultAvatar" size={NAV_ICON_SIZE} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Profile menu modal - matches website Header user dropdown exactly */}
      <Modal visible={profileOpen} transparent animationType="slide" onRequestClose={closeProfile}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeProfile}>
          <View style={styles.menuSheet}>
            <View style={styles.dragHandle} {...profilePanResponder.panHandlers}>
              <View style={styles.dragHandleBar} />
            </View>
            <View style={styles.menuContent}>
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#fbae17" />
                </View>
              ) : !user ? (
                <TouchableOpacity
                  style={styles.signInBtn}
                  onPress={() => {
                    closeProfile();
                    router.push('/login' as any);
                  }}
                >
                  <SvgIcon name="ProfileWhite" size={18} />
                  <Text style={styles.signInText}>{t('signIn')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  {/* User Info Section - same as website */}
                  <View style={styles.userInfoSection}>
                    <View style={styles.userInfoRow}>
                      <View style={styles.userAvatarLarge}>
                        {showAvatarImage ? (
                          <AvatarImage
                            uri={avatarUri!}
                            size={64}
                            style={styles.userAvatarImg}
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <SvgIcon name="DefaultAvatar" size={56} />
                        )}
                      </View>
                      <View style={styles.userInfoText}>
                        <Text style={styles.userName} numberOfLines={1}>{user.username}</Text>
                        <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
                        <View style={styles.userStatsRow}>
                          <Text style={styles.userStat}>{t('level')} {userStats.level}</Text>
                          <Text style={styles.userStatDot}>•</Text>
                          <Text style={styles.userStat}>{userStats.posts} {t('totalPosts')}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  {/* Menu Items - same order and labels as website */}
                  <View style={styles.menuItems}>
                    <TouchableOpacity style={styles.menuRow} onPress={() => { closeProfile(); if (user.username) router.push(`/profile/${user.username}` as any); }}>
                      <View style={styles.menuIconWrap}><SvgIcon name="Profile" size={24} /></View>
                      <View style={styles.menuLabelWrap}>
                        <Text style={styles.menuLabel}>{t('profile')}</Text>
                        <Text style={styles.menuSublabel}>{t('viewYourProfile')}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuRow} onPress={() => { closeProfile(); if (user.username) router.push(`/collection/${user.username}` as any); }}>
                      <View style={styles.menuIconWrap}><SvgIcon name="MyCollection" size={24} /></View>
                      <View style={styles.menuLabelWrap}>
                        <Text style={styles.menuLabel}>{t('myCollection')}</Text>
                        <Text style={styles.menuSublabel}>{t('viewYourGameCollection')}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuRow} onPress={() => { closeProfile(); router.push('/settings' as any); }}>
                      <View style={styles.menuIconWrap}><SvgIcon name="Settings" size={24} /></View>
                      <View style={styles.menuLabelWrap}>
                        <Text style={styles.menuLabel}>{t('settings')}</Text>
                        <Text style={styles.menuSublabel}>{t('manageYourAccount')}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.menuDivider} />
                  {/* Logout - same as website */}
                  <TouchableOpacity
                    style={styles.logoutRow}
                    onPress={async () => {
                      closeProfile();
                      await logout();
                      router.replace('/login');
                    }}
                  >
                    <View style={styles.menuIconWrap}><SvgIcon name="SignOut" size={24} /></View>
                    <View style={styles.menuLabelWrap}>
                      <Text style={styles.logoutLabel}>{t('signOut')}</Text>
                      <Text style={styles.logoutSublabel}>{t('logOutOfYourAccount')}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
    height: 76,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  itemActive: {},
  logo: {
    width: NAV_ICON_SIZE,
    height: NAV_ICON_SIZE,
    resizeMode: 'contain',
  },
  avatarBtn: {
    width: AVATAR_BTN_SIZE,
    height: AVATAR_BTN_SIZE,
    borderRadius: AVATAR_BTN_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  avatar: {
    width: AVATAR_BTN_SIZE,
    height: AVATAR_BTN_SIZE,
    borderRadius: AVATAR_BTN_SIZE / 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuSheet: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragHandle: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  menuContent: {
    paddingBottom: 24,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fbae17',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  signInText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  userInfoSection: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  userAvatarImg: {
    width: 64,
    height: 64,
  },
  userInfoText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userStat: {
    fontSize: 12,
    color: '#4b5563',
  },
  userStatDot: {
    fontSize: 12,
    color: '#9ca3af',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 12,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabelWrap: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  menuSublabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 8,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 12,
  },
  logoutLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc2626',
  },
  logoutSublabel: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 2,
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});
