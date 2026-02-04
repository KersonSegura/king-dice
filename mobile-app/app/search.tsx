/**
 * Search page – search for users or games, with recent searches (Instagram-style).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../lib/api-client';
import { API_BASE_URL } from '../config/api';

const RECENT_KEY = 'kd_recent_searches';
const MAX_RECENT = 20;
const SEARCH_DEBOUNCE_MS = 300;

interface SearchUser {
  id: string;
  username: string;
  avatar?: string | null;
  isFollowing?: boolean;
  type: 'user';
}

interface SearchGame {
  id: string;
  name: string;
  year?: number | null;
  players?: string;
  duration?: string;
  image?: string | null;
  type: 'game';
}

interface RecentItem {
  type: 'user' | 'game';
  id: string;
  name: string;
  username?: string;
  image?: string | null;
  subtitle?: string;
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('data:')) return t;
  const base = API_BASE_URL.replace(/\/$/, '');
  return t.startsWith('/') ? `${base}${t}` : `${base}/${t}`;
}

function AvatarImage({
  uri,
  style,
  fallback,
}: {
  uri: string;
  style?: object;
  fallback: React.ReactNode;
}) {
  const [error, setError] = useState(false);
  if (error) return <>{fallback}</>;
  return (
    <Image
      source={{ uri }}
      style={[styles.avatar, style]}
      contentFit="cover"
      onError={() => setError(true)}
    />
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [games, setGames] = useState<SearchGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecent = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setRecent(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : []);
      } else {
        setRecent([]);
      }
    } catch {
      setRecent([]);
    }
  }, []);

  const saveToRecent = useCallback(async (item: RecentItem) => {
    try {
      const next = [
        item,
        ...recent.filter((r) => !(r.type === item.type && r.id === item.id)),
      ].slice(0, MAX_RECENT);
      setRecent(next);
      await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      //
    }
  }, [recent]);

  const clearRecent = useCallback(async () => {
    setRecent([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setUsers([]);
      setGames([]);
      setLoading(false);
      return;
    }
    if (query.trim().length < 2) {
      setUsers([]);
      setGames([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      try {
        const res = await apiClient.get<{ users: SearchUser[]; games: SearchGame[] }>(
          `/api/search?q=${encodeURIComponent(query.trim())}&type=all&limit=20`
        );
        setUsers(res.users || []);
        setGames(res.games || []);
      } catch {
        setUsers([]);
        setGames([]);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectUser = (u: SearchUser) => {
    Keyboard.dismiss();
    saveToRecent({
      type: 'user',
      id: u.id,
      name: u.username,
      username: u.username,
      image: u.avatar,
    });
    router.push(`/profile/${u.username}` as any);
  };

  const handleSelectGame = (g: SearchGame) => {
    Keyboard.dismiss();
    saveToRecent({
      type: 'game',
      id: g.id,
      name: g.name,
      image: g.image,
      subtitle: g.year ? `${g.year}` : undefined,
    });
    router.push(`/game/${g.id}` as any);
  };

  const handleSelectRecent = (r: RecentItem) => {
    Keyboard.dismiss();
    if (r.type === 'user' && r.username) {
      router.push(`/profile/${r.username}` as any);
    } else if (r.type === 'game') {
      router.push(`/game/${r.id}` as any);
    }
  };

  const showRecent = !query.trim() && recent.length > 0;
  const showResults = query.trim().length >= 2;
  const hasResults = users.length > 0 || games.length > 0;
  const showEmptyResults = showResults && !loading && !hasResults;

  const renderUser = (u: SearchUser) => {
    const avatarUri = resolveImageUrl(u.avatar);
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => handleSelectUser(u)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarWrap, !avatarUri && styles.avatarPlaceholder]}>
          {avatarUri ? (
            <AvatarImage uri={avatarUri} fallback={<Ionicons name="person" size={24} color="#9ca3af" />} />
          ) : (
            <Ionicons name="person" size={24} color="#9ca3af" />
          )}
        </View>
        <View style={styles.resultBody}>
          <Text style={styles.resultName}>{u.username}</Text>
          <Text style={styles.resultSubtitle}>User</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  const renderGame = (g: SearchGame) => {
    const imageUri = resolveImageUrl(g.image);
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => handleSelectGame(g)}
        activeOpacity={0.7}
      >
        <View style={[styles.gameThumbWrap, !imageUri && styles.avatarPlaceholder]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.gameThumb} />
          ) : (
            <Ionicons name="game-controller" size={24} color="#9ca3af" />
          )}
        </View>
        <View style={styles.resultBody}>
          <Text style={styles.resultName} numberOfLines={1}>{g.name}</Text>
          <Text style={styles.resultSubtitle}>
            {[g.year, g.players, g.duration].filter(Boolean).join(' · ') || 'Game'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  const renderRecentItem = (r: RecentItem) => {
    const imageUri = resolveImageUrl(r.image);
    return (
      <TouchableOpacity
        style={styles.resultRow}
        onPress={() => handleSelectRecent(r)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatarWrap, !imageUri && styles.avatarPlaceholder]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatar} />
          ) : (
            <Ionicons
              name={r.type === 'user' ? 'person' : 'game-controller'}
              size={24}
              color="#9ca3af"
            />
          )}
        </View>
        <View style={styles.resultBody}>
          <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
          <Text style={styles.resultSubtitle}>
            {r.type === 'user' ? r.username || 'User' : r.subtitle || 'Game'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchBarWrap}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users or games..."
          placeholderTextColor="#9ca3af"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.resultsArea}
        contentContainerStyle={styles.resultsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showRecent && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <TouchableOpacity onPress={clearRecent}>
                <Text style={styles.clearText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {recent.map((r, i) => (
              <React.Fragment key={`${r.type}-${r.id}-${i}`}>
                {renderRecentItem(r)}
              </React.Fragment>
            ))}
          </>
        )}

        {showResults && loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#fbae17" />
          </View>
        )}

        {showResults && !loading && hasResults && (
          <>
            {users.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Users</Text>
                </View>
                {users.map((u) => (
                  <React.Fragment key={u.id}>{renderUser(u)}</React.Fragment>
                ))}
              </>
            )}
            {games.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Games</Text>
                </View>
                {games.map((g) => (
                  <React.Fragment key={g.id}>{renderGame(g)}</React.Fragment>
                ))}
              </>
            )}
          </>
        )}

        {showEmptyResults && (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No results for "{query.trim()}"</Text>
            <Text style={styles.emptySubtext}>Try different keywords</Text>
          </View>
        )}

        {!showRecent && !showResults && (
          <View style={styles.emptyWrap}>
            <Ionicons name="search-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Search for users or games</Text>
            <Text style={styles.emptySubtext}>Start typing to see results</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 4,
  },
  resultsArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultsContent: {
    flexGrow: 1,
    minHeight: 200,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 14,
    color: '#fbae17',
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f3f4f6',
  },
  avatar: {
    width: 44,
    height: 44,
  },
  avatarPlaceholder: {
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f3f4f6',
  },
  gameThumb: {
    width: 44,
    height: 44,
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  resultSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
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
    marginTop: 6,
  },
});
