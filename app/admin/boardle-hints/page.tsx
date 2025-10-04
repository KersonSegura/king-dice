'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface BoardleHint {
  id: number;
  gameName: string;
  gameMode: string;
  hintText: string;
  hintOrder: number;
}

export default function BoardleHintsAdmin() {
  const { user, isAuthenticated } = useAuth();
  const [hints, setHints] = useState<BoardleHint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHint, setEditingHint] = useState<BoardleHint | null>(null);
  const [newHint, setNewHint] = useState({ gameName: '', gameMode: 'title', hintText: '', hintOrder: 1 });
  const [games, setGames] = useState<string[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchHints();
      fetchGames();
    }
  }, [isAuthenticated, user]);

  const fetchHints = async () => {
    try {
      const response = await fetch('/api/admin/boardle-hints');
      if (response.ok) {
        const data = await response.json();
        setHints(data.hints);
      }
    } catch (error) {
      console.error('Error fetching hints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      if (response.ok) {
        const data = await response.json();
        const gameNames = data.games.map((game: any) => game.nameEn || game.name).filter(Boolean);
        setGames([...new Set(gameNames)].sort());
      }
    } catch (error) {
      console.error('Error fetching games:', error);
    }
  };

  const saveHint = async () => {
    try {
      const response = await fetch('/api/boardle/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName: newHint.gameName,
          gameMode: newHint.gameMode,
          hints: [newHint.hintText]
        })
      });

      if (response.ok) {
        setNewHint({ gameName: '', gameMode: 'title', hintText: '', hintOrder: 1 });
        fetchHints();
      }
    } catch (error) {
      console.error('Error saving hint:', error);
    }
  };

  const deleteHint = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/boardle-hints/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchHints();
      }
    } catch (error) {
      console.error('Error deleting hint:', error);
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading hints...</p>
        </div>
      </div>
    );
  }

  const groupedHints = hints.reduce((acc, hint) => {
    const key = `${hint.gameName}-${hint.gameMode}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(hint);
    return acc;
  }, {} as Record<string, BoardleHint[]>);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Boardle Hints Management</h1>
          <p className="mt-2 text-gray-600">Manage specific hints for Boardle games</p>
        </div>

        {/* Add New Hint */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Hint</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Game Name</label>
              <input
                type="text"
                value={newHint.gameName}
                onChange={(e) => setNewHint({ ...newHint, gameName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter game name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Game Mode</label>
              <select
                value={newHint.gameMode}
                onChange={(e) => setNewHint({ ...newHint, gameMode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="title">Title Mode</option>
                <option value="image">Image Mode</option>
                <option value="card">Card Mode</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hint Text</label>
              <input
                type="text"
                value={newHint.hintText}
                onChange={(e) => setNewHint({ ...newHint, hintText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter hint text"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveHint}
                disabled={!newHint.gameName || !newHint.hintText}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Hint
              </button>
            </div>
          </div>
        </div>

        {/* Existing Hints */}
        <div className="space-y-6">
          {Object.entries(groupedHints).map(([key, gameHints]) => {
            const [gameName, gameMode] = key.split('-');
            return (
              <div key={key} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {gameName} - {gameMode.charAt(0).toUpperCase() + gameMode.slice(1)} Mode
                  </h3>
                  <span className="text-sm text-gray-500">{gameHints.length} hints</span>
                </div>
                <div className="space-y-2">
                  {gameHints.sort((a, b) => a.hintOrder - b.hintOrder).map((hint) => (
                    <div key={hint.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-500 mr-2">#{hint.hintOrder}</span>
                        <span className="text-gray-900">{hint.hintText}</span>
                      </div>
                      <button
                        onClick={() => deleteHint(hint.id)}
                        className="ml-4 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {hints.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No hints found. Add some hints to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}

