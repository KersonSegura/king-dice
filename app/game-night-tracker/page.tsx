'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Share2, Copy, Check, Edit2, X, Edit, Copy as CopyIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import LoginModal from '@/components/LoginModal';

interface Player {
  name: string;
  victories: number;
  gameNights: number;
  gamesPlayed: number;
  winRate: number;
  winRatePercentage: number;
}

interface GameTab {
  id: string;
  name: string;
  players: Player[];
}

interface Tracker {
  id: string;
  user_id: string;
  tracker_name: string;
  share_id: string;
  game_filter: string | null;
  players: Player[];
  created_at: string;
  updated_at: string;
}

export default function GameNightTrackerPage() {
  const t = useTranslations('common');
  const tTracker = useTranslations('gameNightTracker');
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [trackerName, setTrackerName] = useState('My Game Night Tracker');
  const [isEditingTrackerName, setIsEditingTrackerName] = useState(false);
  const [gameTabs, setGameTabs] = useState<GameTab[]>([{ id: 'tab-1', name: 'All Games', players: [] }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [currentTracker, setCurrentTracker] = useState<Tracker | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Get current active tab's players
  const activeTab = gameTabs.find(tab => tab.id === activeTabId);
  const players = activeTab?.players || [];

  // Load tracker from URL if share_id is present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    
    if (shareId) {
      loadSharedTracker(shareId);
    } else if (isAuthenticated && !authLoading) {
      loadUserTrackers();
    }
  }, [isAuthenticated, authLoading]);

  const loadSharedTracker = async (shareId: string) => {
    try {
      const response = await fetch(`/api/game-night-tracker?shareId=${shareId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.tracker) {
          setCurrentTracker(data.tracker);
          setTrackerName(data.tracker.tracker_name);
          // Load tabs from stored data or create default
          if (data.tracker.game_tabs && Array.isArray(data.tracker.game_tabs)) {
            setGameTabs(data.tracker.game_tabs);
            if (data.tracker.game_tabs.length > 0) {
              setActiveTabId(data.tracker.game_tabs[0].id);
            }
          } else {
            // Legacy: convert old format to tabs
            setGameTabs([{ id: 'tab-1', name: data.tracker.game_filter || 'All Games', players: data.tracker.players || [] }]);
          }
          setShareUrl(`${window.location.origin}/game-night-tracker?share=${shareId}`);
        }
      }
    } catch (error) {
      console.error('Error loading shared tracker:', error);
    }
  };

  const loadUserTrackers = async () => {
    try {
      const response = await fetch('/api/game-night-tracker');
      if (response.ok) {
        const data = await response.json();
        if (data.trackers && data.trackers.length > 0) {
          const tracker = data.trackers[0];
          setCurrentTracker(tracker);
          setTrackerName(tracker.tracker_name);
          // Load tabs from stored data or create default
          if (tracker.game_tabs && Array.isArray(tracker.game_tabs)) {
            setGameTabs(tracker.game_tabs);
            if (tracker.game_tabs.length > 0) {
              setActiveTabId(tracker.game_tabs[0].id);
            }
          } else {
            // Legacy: convert old format to tabs
            setGameTabs([{ id: 'tab-1', name: tracker.game_filter || 'All Games', players: tracker.players || [] }]);
          }
          setShareUrl(`${window.location.origin}/game-night-tracker?share=${tracker.share_id}`);
        }
      }
    } catch (error) {
      console.error('Error loading trackers:', error);
    }
  };

  const calculateWinRate = useCallback((victories: number, gamesPlayed: number): { winRate: number; winRatePercentage: number } => {
    if (gamesPlayed === 0) {
      return { winRate: 0, winRatePercentage: 0 };
    }
    const winRate = victories / gamesPlayed;
    const winRatePercentage = winRate * 100;
    return { winRate, winRatePercentage };
  }, []);

  const updatePlayer = (index: number, field: keyof Player, value: number | string) => {
    const updatedTabs = gameTabs.map(tab => {
      if (tab.id === activeTabId) {
        const updatedPlayers = [...tab.players];
        updatedPlayers[index] = {
          ...updatedPlayers[index],
          [field]: value,
        };

        // Recalculate win rate if victories or gamesPlayed changed
        if (field === 'victories' || field === 'gamesPlayed') {
          const { winRate, winRatePercentage } = calculateWinRate(
            updatedPlayers[index].victories,
            updatedPlayers[index].gamesPlayed
          );
          updatedPlayers[index].winRate = winRate;
          updatedPlayers[index].winRatePercentage = winRatePercentage;
        }

        return { ...tab, players: updatedPlayers };
      }
      return tab;
    });
    setGameTabs(updatedTabs);
  };

  const addPlayer = () => {
    const updatedTabs = gameTabs.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          players: [
            ...tab.players,
            {
              name: '',
              victories: 0,
              gameNights: 0,
              gamesPlayed: 0,
              winRate: 0,
              winRatePercentage: 0,
            },
          ],
        };
      }
      return tab;
    });
    setGameTabs(updatedTabs);
  };

  const removePlayer = (index: number) => {
    const updatedTabs = gameTabs.map(tab => {
      if (tab.id === activeTabId) {
        return {
          ...tab,
          players: tab.players.filter((_, i) => i !== index),
        };
      }
      return tab;
    });
    setGameTabs(updatedTabs);
  };

  const addTab = () => {
    const newTabId = `tab-${Date.now()}`;
    const newTab: GameTab = {
      id: newTabId,
      name: `Game ${gameTabs.length + 1}`,
      players: [],
    };
    setGameTabs([...gameTabs, newTab]);
    setActiveTabId(newTabId);
    setEditingTabId(newTabId);
    setEditingTabName(newTab.name);
  };

  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
    setEditingTabId(null);
  };

  const startEditingTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tab = gameTabs.find(t => t.id === tabId);
    if (tab) {
      setEditingTabId(tabId);
      setEditingTabName(tab.name);
    }
  };

  const saveTabName = (tabId: string) => {
    const updatedTabs = gameTabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, name: editingTabName.trim() || tab.name };
      }
      return tab;
    });
    setGameTabs(updatedTabs);
    setEditingTabId(null);
    setEditingTabName('');
  };

  const cancelEditingTab = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  const deleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameTabs.length === 1) {
      showToast(tTracker('cannotDeleteLastTab'), 'error');
      return;
    }
    const updatedTabs = gameTabs.filter(tab => tab.id !== tabId);
    setGameTabs(updatedTabs);
    if (activeTabId === tabId) {
      setActiveTabId(updatedTabs[0].id);
    }
  };

  const duplicateTab = () => {
    if (!activeTab) return;
    
    const newTabId = `tab-${Date.now()}`;
    const duplicatedTab: GameTab = {
      id: newTabId,
      name: `${activeTab.name} (Copy)`,
      players: activeTab.players.map(player => ({ ...player })),
    };
    
    setGameTabs([...gameTabs, duplicatedTab]);
    setActiveTabId(newTabId);
    showToast(tTracker('tabDuplicated'), 'success');
  };

  const saveTracker = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const trackerData = {
        trackerName,
        gameTabs, // Save all tabs
        players: activeTab?.players || [], // Legacy support
        gameFilter: activeTab?.name || null, // Legacy support
      };

      let response;
      if (currentTracker) {
        // Update existing tracker
        response = await fetch('/api/game-night-tracker', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: currentTracker.id, ...trackerData }),
        });
      } else {
        // Create new tracker
        response = await fetch('/api/game-night-tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trackerData),
        });
      }

      if (response.ok) {
        const data = await response.json();
        setCurrentTracker(data.tracker);
        setShareUrl(`${window.location.origin}/game-night-tracker?share=${data.tracker.share_id}`);
        showToast(tTracker('saved'), 'success');
      } else {
        showToast(tTracker('saveError'), 'error');
      }
    } catch (error) {
      console.error('Error saving tracker:', error);
      showToast(tTracker('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    showToast(tTracker('linkCopied'), 'success');
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Filter players with victories for chart
  const playersWithVictories = players.filter(p => p.victories > 0);
  const totalVictories = playersWithVictories.reduce((sum, p) => sum + p.victories, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#fbae17] mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('backToHome')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
              <img
                src="/GameNightTrackerIconYellow.svg"
                alt="Game Night Tracker Icon"
                className="w-9 h-9 flex-none"
              />
              <span>{tTracker('title')}</span>
            </h1>
            <p className="text-lg text-gray-600">{tTracker('subtitle')}</p>
          </div>
        </div>

        {/* Players Table Container */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          {/* Tracker Name at Top */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            {isEditingTrackerName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={trackerName}
                  onChange={(e) => setTrackerName(e.target.value)}
                  onBlur={() => setIsEditingTrackerName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTrackerName(false);
                    }
                  }}
                  className="flex-1 text-2xl font-bold text-gray-900 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                  autoFocus
                />
                <button
                  onClick={() => setIsEditingTrackerName(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-gray-900">{trackerName}</h2>
                <button
                  onClick={() => setIsEditingTrackerName(true)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title={tTracker('editTrackerName')}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Players Header with Edit, Add Player, Duplicate, and Save */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{tTracker('players')}</h3>
            <div className="flex items-center space-x-2">
              {isEditMode && (
                <>
                  <button
                    onClick={addPlayer}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#fbae17] text-white rounded-md hover:bg-[#e0990f] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{tTracker('addPlayer')}</span>
                  </button>
                  <button
                    onClick={duplicateTab}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title={tTracker('duplicateSheet')}
                  >
                    <CopyIcon className="w-4 h-4" />
                    <span>{tTracker('duplicateSheet')}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>{isEditMode ? tTracker('exitEdit') : tTracker('edit')}</span>
              </button>
              <button
                onClick={saveTracker}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? tTracker('saving') : tTracker('save')}</span>
              </button>
            </div>
          </div>

          {/* Players Table */}
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('playerName')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('victories')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('gameNights')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('gamesPlayed')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('winRate')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('winRatePercentage')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tTracker('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {tTracker('noPlayers')}
                    </td>
                  </tr>
                ) : (
                  players.map((player, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditMode ? (
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                            placeholder={tTracker('playerNamePlaceholder')}
                          />
                        ) : (
                          <span className="text-gray-900 font-medium">{player.name || tTracker('unnamedPlayer')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditMode ? (
                          <input
                            type="number"
                            min="0"
                            value={player.victories}
                            onChange={(e) => updatePlayer(index, 'victories', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                          />
                        ) : (
                          <span className="text-gray-900">{player.victories}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditMode ? (
                          <input
                            type="number"
                            min="0"
                            value={player.gameNights}
                            onChange={(e) => updatePlayer(index, 'gameNights', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                          />
                        ) : (
                          <span className="text-gray-900">{player.gameNights}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditMode ? (
                          <input
                            type="number"
                            min="0"
                            value={player.gamesPlayed}
                            onChange={(e) => updatePlayer(index, 'gamesPlayed', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                          />
                        ) : (
                          <span className="text-gray-900">{player.gamesPlayed}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {player.winRate.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {player.winRatePercentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEditMode && (
                          <button
                            onClick={() => removePlayer(index)}
                            className="text-red-600 hover:text-red-800"
                            title={tTracker('removePlayer')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Game Tabs (like Excel sheets) */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {gameTabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`group flex items-center space-x-2 px-4 py-2 cursor-pointer transition-colors ${
                    activeTabId === tab.id
                      ? 'bg-[#fbae17] text-white rounded-b-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-b-lg'
                  }`}
                >
                  {editingTabId === tab.id ? (
                    <>
                      <input
                        type="text"
                        value={editingTabName}
                        onChange={(e) => setEditingTabName(e.target.value)}
                        onBlur={() => saveTabName(tab.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveTabName(tab.id);
                          } else if (e.key === 'Escape') {
                            cancelEditingTab();
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-24 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17] text-gray-900 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveTabName(tab.id);
                        }}
                        className="text-current hover:opacity-80"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditingTab();
                        }}
                        className="text-current hover:opacity-80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">{tab.name}</span>
                      <button
                        onClick={(e) => startEditingTab(tab.id, e)}
                        className="text-current hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={tTracker('renameTab')}
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {gameTabs.length > 1 && (
                        <button
                          onClick={(e) => deleteTab(tab.id, e)}
                          className="text-current hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={tTracker('deleteTab')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
              <button
                onClick={addTab}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-b-lg hover:bg-gray-200 transition-colors"
                title={tTracker('addTab')}
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">{tTracker('addTab')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Victory Chart */}
        {playersWithVictories.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{tTracker('victoryChart')}</h2>
            <VictoryPieChart players={playersWithVictories} totalVictories={totalVictories} />
          </div>
        )}

        {/* Share Section */}
        {shareUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{tTracker('shareTitle')}</h3>
            <div className="flex items-center space-x-2 px-4 py-3 bg-gray-50 rounded-md border border-gray-200">
              <Share2 className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
              />
              <button
                onClick={copyShareUrl}
                className="text-[#fbae17] hover:text-[#e0990f] transition-colors"
                title={tTracker('copyLink')}
              >
                {shareCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer locale={locale} />

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}

// Simple SVG Pie Chart Component
function VictoryPieChart({ players, totalVictories }: { players: Player[]; totalVictories: number }) {
  const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const size = 300;
  const radius = 120;
  const center = size / 2;

  let currentAngle = -90; // Start from top

  const slices = players.map((player, index) => {
    const percentage = (player.victories / totalVictories) * 100;
    const angle = (percentage / 100) * 360;
    
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startAngleRad);
    const y1 = center + radius * Math.sin(startAngleRad);
    const x2 = center + radius * Math.cos(endAngleRad);
    const y2 = center + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return {
      pathData,
      color: colors[index % colors.length],
      player,
      percentage,
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      <svg width={size} height={size} className="flex-shrink-0">
        {slices.map((slice, index) => (
          <path
            key={index}
            d={slice.pathData}
            fill={slice.color}
            stroke="white"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="space-y-2">
        {slices.map((slice, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-sm text-gray-700">
              <strong>{slice.player.name}</strong>: {slice.player.victories} {slice.player.victories === 1 ? 'win' : 'wins'} • {slice.percentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
