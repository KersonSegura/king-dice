'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, Share2, Copy, Check, Edit2, X, Edit, Copy as CopyIcon, GripVertical } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import LoginModal from '@/components/LoginModal';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Player {
  name: string;
  victories: number;
  gameNights: number;
  gamesPlayed: number;
  winRate: number;
  winRatePercentage: number;
  color?: string; // Player's color for charts
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
  game_tabs: GameTab[] | null;
  created_at: string;
  updated_at: string;
}

// Available colors for players (20 colors, no white)
const PLAYER_COLORS = [
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#a855f7', // purple
  '#e11d48', // rose
  '#22c55e', // emerald
  '#fbbf24', // yellow
  '#0ea5e9', // sky
  '#64748b', // slate
  '#dc2626', // red-600
  '#059669', // green-600
  '#d97706', // amber-600
];

// Sortable Tab Component
interface SortableTabProps {
  tab: GameTab;
  isActive: boolean;
  isEditing: boolean;
  editingTabName: string;
  onTabClick: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (value: string) => void;
  onDelete: (e: React.MouseEvent) => void;
  canDelete: boolean;
  tTracker: any;
}

function SortableTab({
  tab,
  isActive,
  isEditing,
  editingTabName,
  onTabClick,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onDelete,
  canDelete,
  tTracker,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onTabClick}
      className={`group flex items-center space-x-2 px-4 py-2 cursor-pointer transition-colors ${
        isActive
          ? 'bg-[#fbae17] text-white rounded-b-lg'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-b-lg'
      } ${isDragging ? 'z-50' : ''}`}
    >
      {isEditing ? (
        <>
          <input
            type="text"
            value={editingTabName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveEdit();
              } else if (e.key === 'Escape') {
                onCancelEdit();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-24 px-1 py-0.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17] text-gray-900 bg-white"
            autoFocus
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveEdit();
            }}
            className="text-current hover:opacity-80"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelEdit();
            }}
            className="text-current hover:opacity-80"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>
          <span className="text-sm font-medium">{tab.name}</span>
          <button
            onClick={(e) => onStartEdit(e)}
            className="text-current hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
            title={tTracker('renameTab')}
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => onDelete(e)}
              className="text-current hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
              title={tTracker('deleteTab')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function UserTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const t = useTranslations('common');
  const tTracker = useTranslations('gameNightTracker');
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [trackerName, setTrackerName] = useState('');
  const [isEditingTrackerName, setIsEditingTrackerName] = useState(false);
  const [gameTabs, setGameTabs] = useState<GameTab[]>([{ id: 'tab-1', name: 'All Games', players: [] }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingTabName, setEditingTabName] = useState('');
  const [currentTracker, setCurrentTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteTabConfirm, setShowDeleteTabConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Player | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [graphView, setGraphView] = useState<'pie' | 'bar'>('pie');
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get current active tab's players
  const activeTab = gameTabs.find(tab => tab.id === activeTabId);
  const rawPlayers = activeTab?.players || [];
  
  // Check if viewing own tracker
  const isOwnTracker = currentTracker && user && currentTracker.user_id === user.id;
  
  // Sort players
  const players = [...rawPlayers].sort((a, b) => {
    if (!sortColumn) return 0;
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });
  
  // Find max victories for highlighting
  const maxVictories = players.length > 0 ? Math.max(...players.map(p => p.victories)) : 0;

  // Load tracker by username
  useEffect(() => {
    if (username) {
      loadTrackerByUsername(username);
    }
  }, [username]);

  const loadTrackerByUsername = async (usernameParam: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/game-night-tracker?username=${usernameParam}`);
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
          // Set share URL
          if (user?.username && data.tracker.user_id === user.id) {
            setShareUrl(`${window.location.origin}/game-night-tracker/${user.username}`);
          } else {
            setShareUrl(`${window.location.origin}/game-night-tracker/${usernameParam}`);
          }
        }
      } else {
        showToast('Tracker not found', 'error');
        // Redirect to home or profile if tracker not found
        if (isOwnTracker && user?.username) {
          router.push(`/game-night-tracker/${user.username}`);
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error loading tracker by username:', error);
      showToast('Failed to load tracker', 'error');
      router.push('/game-night-tracker');
    } finally {
      setLoading(false);
    }
  };

  // Handle column sorting
  const handleSort = (column: keyof Player) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  // Calculate win rate
  const calculateWinRate = useCallback((victories: number, gamesPlayed: number): { winRate: number; winRatePercentage: number } => {
    if (gamesPlayed === 0) {
      return { winRate: 0, winRatePercentage: 0 };
    }
    const winRate = victories / gamesPlayed;
    const winRatePercentage = winRate * 100;
    return { winRate, winRatePercentage };
  }, []);

  // Update player
  const updatePlayer = (index: number, field: keyof Player, value: number | string) => {
    const updatedTabs = gameTabs.map(tab => {
      if (tab.id === activeTabId) {
        const updatedPlayers = [...tab.players];
        if (index >= 0 && index < updatedPlayers.length) {
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
        }

        return { ...tab, players: updatedPlayers };
      }
      return tab;
    });
    setGameTabs(updatedTabs);
  };

  // Add player
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
              color: PLAYER_COLORS[tab.players.length % PLAYER_COLORS.length],
            },
          ],
        };
      }
      return tab;
    });
    setGameTabs(updatedTabs);
  };

  // Remove player
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

  // Add tab
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

  // Switch tab
  const switchTab = (tabId: string) => {
    setActiveTabId(tabId);
    setEditingTabId(null);
  };

  // Start editing tab
  const startEditingTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tab = gameTabs.find(t => t.id === tabId);
    if (tab) {
      setEditingTabId(tabId);
      setEditingTabName(tab.name);
    }
  };

  // Save tab name
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

  // Cancel editing tab
  const cancelEditingTab = () => {
    setEditingTabId(null);
    setEditingTabName('');
  };

  // Delete tab
  const deleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameTabs.length === 1) {
      showToast(tTracker('cannotDeleteLastTab'), 'error');
      return;
    }
    setTabToDelete(tabId);
    setShowDeleteTabConfirm(true);
  };

  // Confirm delete tab
  const confirmDeleteTab = () => {
    if (!tabToDelete) return;
    if (gameTabs.length === 1) {
      showToast(tTracker('cannotDeleteLastTab'), 'error');
      setShowDeleteTabConfirm(false);
      setTabToDelete(null);
      return;
    }
    const updatedTabs = gameTabs.filter(tab => tab.id !== tabToDelete);
    setGameTabs(updatedTabs);
    if (activeTabId === tabToDelete) {
      setActiveTabId(updatedTabs[0].id);
    }
    setShowDeleteTabConfirm(false);
    setTabToDelete(null);
  };

  // Duplicate tab
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
  
  // Handle drag end for tabs
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setGameTabs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Save tracker
  const saveTracker = async () => {
    if (!isOwnTracker || !currentTracker) return;
    
    setIsSaving(true);
    try {
      const trackerData = {
        trackerName,
        gameTabs,
        players: activeTab?.players || [],
        gameFilter: activeTab?.name || null,
      };

      const response = await fetch('/api/game-night-tracker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentTracker.id, ...trackerData }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTracker(data.tracker);
        if (user?.username) {
          setShareUrl(`${window.location.origin}/game-night-tracker/${user.username}`);
        }
        showToast(tTracker('saved'), 'success');
        setIsEditMode(false);
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

  // Copy share URL
  const copyShareUrl = async () => {
    if (!shareUrl) {
      if (user?.username) {
        const url = `${window.location.origin}/game-night-tracker/${user.username}`;
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        showToast(tTracker('linkCopied'), 'success');
        setTimeout(() => setShareCopied(false), 2000);
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      showToast(tTracker('linkCopied'), 'success');
      setTimeout(() => setShareCopied(false), 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  };
  
  // Filter players with victories for chart
  const playersWithVictories = players.filter(p => p.victories > 0);
  const totalVictories = playersWithVictories.reduce((sum, p) => sum + p.victories, 0);

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-gray-50 z-50">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-center">
            <Image 
              src="/DiceLogo.svg" 
              alt="Loading..." 
              width={64} 
              height={64} 
              className="opacity-60 mx-auto mb-4 animate-pulse"
            />
            <p className="text-gray-600">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTracker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Tracker not found</p>
          <Link href="/game-night-tracker" className="text-[#fbae17] hover:underline">
            Go to Game Night Tracker
          </Link>
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
            {isOwnTracker && isEditingTrackerName ? (
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
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[#fbae17] to-[#e0990f] bg-clip-text text-transparent">
                  {trackerName}
                </h2>
                {isOwnTracker && (
                  <button
                    onClick={() => setIsEditingTrackerName(true)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title={tTracker('editTrackerName')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
            {username && (
              <p className="text-sm text-gray-500 mt-1">by @{username}</p>
            )}
          </div>

          {/* Players Header with Edit, Add Player, Duplicate, and Save */}
          {isOwnTracker && (
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
          )}
          {!isOwnTracker && (
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">{tTracker('players')}</h3>
            </div>
          )}

          {/* Players Table */}
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{tTracker('playerName')}</span>
                      {sortColumn === 'name' && (
                        <span className="text-[#fbae17]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('victories')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{tTracker('victories')}</span>
                      {sortColumn === 'victories' && (
                        <span className="text-[#fbae17]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('gameNights')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{tTracker('gameNights')}</span>
                      {sortColumn === 'gameNights' && (
                        <span className="text-[#fbae17]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('gamesPlayed')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{tTracker('gamesPlayed')}</span>
                      {sortColumn === 'gamesPlayed' && (
                        <span className="text-[#fbae17]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('winRate')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{tTracker('winRate')}</span>
                      {sortColumn === 'winRate' && (
                        <span className="text-[#fbae17]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('winRatePercentage')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>{tTracker('winRatePercentage')}</span>
                      {sortColumn === 'winRatePercentage' && (
                        <span className="text-[#fbae17]">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                  {isEditMode && isOwnTracker && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tTracker('actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={isEditMode && isOwnTracker ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
                      {tTracker('noPlayers')}
                    </td>
                  </tr>
                ) : (
                  players.map((player, index) => {
                    const isTopWinner = player.victories === maxVictories && maxVictories > 0;
                    const originalIndex = rawPlayers.findIndex(p => p === player);
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 transition-colors ${
                          isTopWinner ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {/* Color circle */}
                            <button
                              onClick={() => {
                                if (isEditMode && isOwnTracker && originalIndex !== -1) {
                                  setPlayerForColorChange(originalIndex);
                                  setShowColorPicker(true);
                                }
                              }}
                              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                isEditMode && isOwnTracker ? 'cursor-pointer hover:scale-110 transition-transform border-gray-300' : 'cursor-default border-transparent'
                              }`}
                              style={{ 
                                backgroundColor: player.color || PLAYER_COLORS[originalIndex % PLAYER_COLORS.length]
                              }}
                              title={isEditMode && isOwnTracker ? 'Change color' : undefined}
                            />
                            {isEditMode && isOwnTracker ? (
                              <input
                                type="text"
                                value={player.name}
                                onChange={(e) => {
                                  if (originalIndex !== -1) updatePlayer(originalIndex, 'name', e.target.value);
                                }}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17]"
                                placeholder={tTracker('playerNamePlaceholder')}
                              />
                            ) : (
                              <span className={`font-medium ${isTopWinner ? 'text-yellow-700 font-bold' : 'text-gray-900'}`}>
                                {player.name || tTracker('unnamedPlayer')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {isEditMode && isOwnTracker ? (
                            <input
                              type="number"
                              min="0"
                              value={player.victories}
                              onChange={(e) => {
                                if (originalIndex !== -1) updatePlayer(originalIndex, 'victories', parseInt(e.target.value) || 0);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17] mx-auto"
                            />
                          ) : (
                            <span className={`${isTopWinner ? 'text-yellow-700 font-bold' : 'text-gray-900'}`}>
                              {player.victories}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {isEditMode && isOwnTracker ? (
                            <input
                              type="number"
                              min="0"
                              value={player.gameNights}
                              onChange={(e) => {
                                if (originalIndex !== -1) updatePlayer(originalIndex, 'gameNights', parseInt(e.target.value) || 0);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17] mx-auto"
                            />
                          ) : (
                            <span className="text-gray-900">{player.gameNights}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {isEditMode && isOwnTracker ? (
                            <input
                              type="number"
                              min="0"
                              value={player.gamesPlayed}
                              onChange={(e) => {
                                if (originalIndex !== -1) updatePlayer(originalIndex, 'gamesPlayed', parseInt(e.target.value) || 0);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#fbae17] mx-auto"
                            />
                          ) : (
                            <span className="text-gray-900">{player.gamesPlayed}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                          {player.winRate.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 font-semibold">
                          {player.winRatePercentage.toFixed(1)}%
                        </td>
                        {isEditMode && isOwnTracker && (
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => {
                                if (originalIndex !== -1) removePlayer(originalIndex);
                              }}
                              className="text-red-600 hover:text-red-800"
                              title={tTracker('removePlayer')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Game Tabs */}
          {isOwnTracker ? (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={gameTabs.map(tab => tab.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                    {gameTabs.map((tab) => (
                      <SortableTab
                        key={tab.id}
                        tab={tab}
                        isActive={activeTabId === tab.id}
                        isEditing={editingTabId === tab.id}
                        editingTabName={editingTabName}
                        onTabClick={() => switchTab(tab.id)}
                        onStartEdit={(e) => startEditingTab(tab.id, e)}
                        onSaveEdit={() => saveTabName(tab.id)}
                        onCancelEdit={cancelEditingTab}
                        onEditNameChange={setEditingTabName}
                        onDelete={(e) => deleteTab(tab.id, e)}
                        canDelete={gameTabs.length > 1}
                        tTracker={tTracker}
                      />
                    ))}
                    {isEditMode && (
                      <button
                        onClick={addTab}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-b-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        + {tTracker('addTab')}
                      </button>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {gameTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-4 py-2 cursor-pointer transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-[#fbae17] text-white rounded-b-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-b-lg'
                    }`}
                  >
                    <span className="text-sm font-medium">{tab.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Victory Chart */}
        {playersWithVictories.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{tTracker('victoryChart')}</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setGraphView('pie')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    graphView === 'pie'
                      ? 'bg-[#fbae17] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tTracker('pie')}
                </button>
                <button
                  onClick={() => setGraphView('bar')}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    graphView === 'bar'
                      ? 'bg-[#fbae17] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tTracker('bar')}
                </button>
              </div>
            </div>
            {graphView === 'pie' ? (
              <VictoryPieChart players={playersWithVictories} totalVictories={totalVictories} tTracker={tTracker} />
            ) : (
              <VictoryBarChart players={playersWithVictories} totalVictories={totalVictories} tTracker={tTracker} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer locale={locale} />
    </div>
  );
}

// Simple SVG Pie Chart Component
function VictoryPieChart({ players, totalVictories, tTracker }: { players: Player[]; totalVictories: number; tTracker: any }) {
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
      color: player.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
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
              <strong>{slice.player.name}</strong>: {slice.player.victories} {slice.player.victories === 1 ? tTracker('win') : tTracker('wins')} • {slice.player.winRatePercentage.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple SVG Bar Chart Component
function VictoryBarChart({ players, totalVictories, tTracker }: { players: Player[]; totalVictories: number; tTracker: any }) {
  const maxVictories = Math.max(...players.map(p => p.victories), 1);
  const barHeight = 40;
  const nameWidth = 120;
  const textPadding = 20;
  const maxBarWidth = 500;
  const chartHeight = players.length * (barHeight + 10);
  
  // Calculate the maximum text width needed
  const maxTextLength = Math.max(
    ...players.map(p => {
      const text = `${p.victories} ${p.victories === 1 ? tTracker('win') : tTracker('wins')} • ${p.winRatePercentage.toFixed(1)}%`;
      return text.length;
    })
  );
  
  // Calculate total chart width with enough space for text
  const chartWidth = nameWidth + maxBarWidth + (maxTextLength * 8) + textPadding;
  
  return (
    <div className="flex flex-col md:flex-row items-start justify-center gap-8 overflow-x-auto w-full">
      <svg width={chartWidth} height={chartHeight} className="flex-shrink-0" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {players.map((player, index) => {
          const barWidth = (player.victories / maxVictories) * maxBarWidth;
          const y = index * (barHeight + 10);
          const textX = nameWidth + barWidth + textPadding;
          
          return (
            <g key={index}>
              <rect
                x={nameWidth}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={player.color || PLAYER_COLORS[index % PLAYER_COLORS.length]}
                rx={4}
              />
              <text
                x={10}
                y={y + barHeight / 2}
                dominantBaseline="middle"
                className="text-sm font-medium fill-gray-700"
              >
                {player.name}
              </text>
              <text
                x={textX}
                y={y + barHeight / 2}
                dominantBaseline="middle"
                className="text-sm font-semibold fill-gray-900"
              >
                {player.victories} {player.victories === 1 ? tTracker('win') : tTracker('wins')} • {player.winRatePercentage.toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
