'use client';

import { useMemo, useState } from 'react';

type DashboardResponse = {
  metrics: {
    totalUsers: number;
    activeUsers24h: number;
    activeUsers7d: number;
    newUsers30d: number;
    totalGames: number;
    totalPosts: number;
    totalGalleryImages: number;
    totalMessages: number;
  };
  storage: {
    totalUsedPretty: string;
    databaseRemaining: string;
    buckets: Array<{ bucket: string; usedPretty: string }>;
  };
  traffic: {
    summary: string;
    topVisitedLinks: Array<{ path: string; title: string; views: number; downloads: number }>;
  };
  locations: {
    available: boolean;
    message: string;
  };
  generatedAt: string;
};

type AdminUser = {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isVerified: boolean;
  level: number;
  xp: number;
  createdAt: string;
  updatedAt: string;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Request failed');
  }
  return data as T;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const activeRatio = useMemo(() => {
    if (!dashboard?.metrics.totalUsers) return '0%';
    return `${Math.round((dashboard.metrics.activeUsers7d / dashboard.metrics.totalUsers) * 100)}%`;
  }, [dashboard]);

  const verifyAccess = async () => {
    setLoading(true);
    setError('');
    try {
      await requestJson('/api/admin/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setVerified(true);
      await Promise.all([loadDashboard(), loadUsers('')]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    const data = await requestJson<{ success: boolean } & DashboardResponse>('/api/admin/dashboard');
    setDashboard(data);
  };

  const loadUsers = async (q: string) => {
    const data = await requestJson<{ success: boolean; users: AdminUser[] }>(
      `/api/admin/users?q=${encodeURIComponent(q)}&limit=50`
    );
    setUsers(data.users || []);
  };

  const onSearch = async () => {
    try {
      setError('');
      await loadUsers(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    }
  };

  const updateUser = async (userId: string, action: string, value: unknown) => {
    setBusyUserId(userId);
    setError('');
    try {
      await requestJson(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, value }),
      });
      await loadUsers(query);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setBusyUserId(null);
    }
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Delete account "${username}" permanently? This cannot be undone.`)) return;
    setBusyUserId(userId);
    setError('');
    try {
      await requestJson(`/api/admin/users/${userId}`, { method: 'DELETE' });
      await loadUsers(query);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setBusyUserId(null);
    }
  };

  if (!verified) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
        <section className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
          <p className="text-sm text-white/70 mb-4">
            Confirm with your King Dice account password to continue.
          </p>
          <input
            type="password"
            className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 mb-3 outline-none focus:border-emerald-400"
            placeholder="Account password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') verifyAccess();
            }}
          />
          <button
            type="button"
            disabled={loading || !password.trim()}
            onClick={verifyAccess}
            className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 px-4 py-2 font-semibold"
          >
            {loading ? 'Verifying...' : 'Enter Admin Panel'}
          </button>
          {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
          <button
            type="button"
            onClick={() => {
              loadDashboard().catch((err) => setError(err instanceof Error ? err.message : 'Refresh failed'));
              loadUsers(query).catch((err) => setError(err instanceof Error ? err.message : 'Refresh failed'));
            }}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
          >
            Refresh
          </button>
        </header>

        {error && <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-red-200">{error}</p>}

        {dashboard && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">Total Users</p>
                <p className="text-2xl font-bold">{dashboard.metrics.totalUsers}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">Active Users (7d)</p>
                <p className="text-2xl font-bold">{dashboard.metrics.activeUsers7d}</p>
                <p className="text-xs text-white/60">{activeRatio} of all users</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">Active Users (24h)</p>
                <p className="text-2xl font-bold">{dashboard.metrics.activeUsers24h}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs text-white/60">Total Games</p>
                <p className="text-2xl font-bold">{dashboard.metrics.totalGames}</p>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-semibold mb-3">Storage</h2>
                <p className="text-sm text-white/80">Used: {dashboard.storage.totalUsedPretty}</p>
                <p className="text-sm text-white/60">Remaining DB storage: {dashboard.storage.databaseRemaining}</p>
                <div className="mt-3 space-y-1">
                  {dashboard.storage.buckets.map((bucket) => (
                    <p key={bucket.bucket} className="text-xs text-white/70">
                      {bucket.bucket}: {bucket.usedPretty}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-lg font-semibold mb-3">Traffic + Popular Links</h2>
                <p className="text-xs text-white/60 mb-3">{dashboard.traffic.summary}</p>
                <div className="space-y-2">
                  {dashboard.traffic.topVisitedLinks.length === 0 && (
                    <p className="text-sm text-white/60">No tracked link visits available yet.</p>
                  )}
                  {dashboard.traffic.topVisitedLinks.slice(0, 6).map((link) => (
                    <div key={`${link.path}-${link.title}`} className="text-sm border-b border-white/10 pb-1">
                      <p className="font-medium">{link.title || link.path}</p>
                      <p className="text-white/60">{link.path}</p>
                      <p className="text-white/70">Views: {link.views} | Downloads: {link.downloads}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="text-lg font-semibold mb-2">Locations</h2>
              <p className="text-sm text-white/70">{dashboard.locations.message}</p>
            </section>
          </>
        )}

        <section className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between mb-3">
            <h2 className="text-lg font-semibold">User Management</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or email"
                className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm min-w-[240px]"
              />
              <button
                type="button"
                onClick={onSearch}
                className="rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
              >
                Search
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/60 border-b border-white/10">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Level</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const busy = busyUserId === u.id;
                  const blocked = !u.isVerified;
                  return (
                    <tr key={u.id} className="border-b border-white/5 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{u.username}</p>
                        <p className="text-xs text-white/60">{u.id}</p>
                      </td>
                      <td className="py-3 pr-3">{u.email}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            defaultValue={u.level}
                            disabled={busy}
                            onBlur={(e) => {
                              const newLevel = Number(e.target.value);
                              if (newLevel !== u.level) {
                                updateUser(u.id, 'setLevel', newLevel);
                              }
                            }}
                            className="w-16 rounded border border-white/20 bg-black/30 px-2 py-1"
                          />
                          <span className="text-xs text-white/60">XP {u.xp}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <p>{blocked ? 'Blocked' : 'Active'}</p>
                        <p className="text-xs text-white/60">{u.isAdmin ? 'Admin' : 'User'}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateUser(u.id, 'setBlocked', !blocked)}
                            className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-50"
                          >
                            {blocked ? 'Unblock' : 'Block'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateUser(u.id, 'setAdmin', !u.isAdmin)}
                            className="rounded border border-white/20 px-2 py-1 hover:bg-white/10 disabled:opacity-50"
                          >
                            {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => deleteUser(u.id, u.username)}
                            className="rounded border border-red-400/60 text-red-200 px-2 py-1 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {dashboard && (
          <p className="text-xs text-white/50">
            Last refresh: {new Date(dashboard.generatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </main>
  );
}

