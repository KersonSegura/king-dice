'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  DragOverlay,
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
  isEditMode: boolean;
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
  isEditMode,
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
    minHeight: '30px',
    maxHeight: '30px',
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      onStartEdit(e);
    }
  };

  return (
            <div
              ref={setNodeRef}
              style={style}
              onClick={onTabClick}
              onDoubleClick={handleDoubleClick}
              {...attributes}
              {...listeners}
              className={`group flex items-center space-x-1 sm:space-x-2 px-1 sm:px-3 py-0 sm:py-1.5 cursor-grab active:cursor-grabbing transition-colors text-xs sm:text-sm h-[30px] sm:h-auto touch-none box-border ${
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
            className="hidden sm:block cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>
          <span className="text-sm font-medium">{tab.name}</span>
          <button
            onClick={(e) => onStartEdit(e)}
            className="hidden sm:inline-flex text-current hover:opacity-80 opacity-0 group-hover:opacity-100 transition-opacity"
            title={tTracker('renameTab')}
          >
            <Edit2 className="w-3 h-3" />
          </button>
          {isEditMode && canDelete && (
            <button
              onClick={(e) => onDelete(e)}
              className="flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors ml-1 flex-shrink-0"
              style={{ minWidth: '1rem', minHeight: '1rem', aspectRatio: '1 / 1' }}
              title={tTracker('deleteTab')}
            >
              <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function GameNightTrackerPage() {
  const t = useTranslations('common');
  const tTracker = useTranslations('gameNightTracker');
  const locale = useLocale();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
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
  // Delete tab confirmation dialog state
  const [showDeleteTabConfirm, setShowDeleteTabConfirm] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<string | null>(null);
  // Graph view type (pie, bar)
  const [graphView, setGraphView] = useState<'pie' | 'bar'>('pie');
  // Sorting state
  const [sortColumn, setSortColumn] = useState<keyof Player | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Color picker state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [playerForColorChange, setPlayerForColorChange] = useState<number | null>(null);
  
  // Lock body scroll when color picker is open
  useEffect(() => {
    if (showColorPicker) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showColorPicker]);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get current active tab's players
  const activeTab = gameTabs.find(tab => tab.id === activeTabId);
  const rawPlayers = activeTab?.players || [];
  
  // Check if viewing shared tracker (not owner)
  const isSharedView = currentTracker && (!isAuthenticated || currentTracker.user_id !== user?.id);
  
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

  // Redirect to username route or load shared tracker
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    const pathname = window.location.pathname;
    
    // If we're on a username route, redirect to that route
    const usernameMatch = pathname.match(/^\/game-night-tracker\/([^\/]+)$/);
    if (usernameMatch && usernameMatch[1]) {
      // Already on username route, let that page handle it
      return;
    }
    
    if (shareId) {
      // Load shared tracker via share link
      loadSharedTracker(shareId);
    } else if (isAuthenticated && !authLoading && user?.username) {
      // Redirect to username-based route
      router.push(`/game-night-tracker/${user.username}`);
    }
  }, [isAuthenticated, authLoading, user?.username, router]);

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

  const loadTrackerByUsername = async (username: string) => {
    try {
      const response = await fetch(`/api/game-night-tracker?username=${username}`);
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
        }
      }
    } catch (error) {
      console.error('Error loading tracker by username:', error);
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
    setTabToDelete(tabId);
    setShowDeleteTabConfirm(true);
  };

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
        // Use username-based URL if available, otherwise use share link
        if (data.tracker.user_id && user?.id === data.tracker.user_id && user?.username) {
          setShareUrl(`${window.location.origin}/game-night-tracker/${user.username}`);
        } else {
          setShareUrl(`${window.location.origin}/game-night-tracker?share=${data.tracker.share_id}`);
        }
        showToast(tTracker('saved'), 'success');
        setIsEditMode(false); // Exit edit mode after saving
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

  // Handle column sorting
  const handleSort = (column: keyof Player) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  // Filter players with victories for chart
  const playersWithVictories = players.filter(p => p.victories > 0);
  const totalVictories = playersWithVictories.reduce((sum, p) => sum + p.victories, 0);

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b w-full max-w-full">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4 w-full max-w-full">
          <Link 
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            {t('backToHome')}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-center mb-3 sm:mb-8 px-2">
          <div className="text-center w-full max-w-full">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center justify-center gap-1.5 sm:gap-3 flex-wrap">
              <img
                src="/GameNightTrackerIconYellow.svg"
                alt="Game Night Tracker Icon"
                className="w-6 h-6 sm:w-9 sm:h-9 flex-none"
              />
              <span className="text-2xl sm:text-4xl break-words">{tTracker('title')}</span>
            </h1>
            <p className="text-sm sm:text-lg text-gray-600 px-1 break-words">{tTracker('subtitle')}</p>
          </div>
        </div>

        {/* Players Table Container */}
        <div className="bg-white rounded-none sm:rounded-lg shadow-sm border border-gray-200 p-2 sm:p-6 mb-4 sm:mb-6">
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
              <div className="flex items-center space-x-1 sm:space-x-2 w-full max-w-full min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-[#fbae17] truncate min-w-0 flex-1">{trackerName}</h2>
                <button
                  onClick={() => setIsEditingTrackerName(true)}
                  className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                  title={tTracker('editTrackerName')}
                >
                  <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Players Header - only for shared view */}
          {isSharedView && (
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">{tTracker('players')}</h3>
            </div>
          )}

          {/* Players Table */}
          <div className="overflow-x-auto mb-2 sm:mb-4 -mx-2 sm:mx-0 pb-4 sm:pb-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '600px' }}>
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
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
                  {isEditMode && !isSharedView && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {tTracker('actions')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={isEditMode && !isSharedView ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
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
                          isTopWinner ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-left">
                          <div className="flex items-center space-x-2">
                            {/* Color circle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSharedView && originalIndex !== -1) {
                                  setPlayerForColorChange(originalIndex);
                                  setShowColorPicker(true);
                                }
                              }}
                              className={`w-4 h-4 min-w-[1rem] min-h-[1rem] rounded-full border-2 flex-shrink-0 ${
                                !isSharedView ? 'cursor-pointer hover:scale-110 transition-transform border-gray-300' : 'cursor-default border-transparent'
                              }`}
                              style={{ 
                                backgroundColor: player.color || PLAYER_COLORS[originalIndex % PLAYER_COLORS.length],
                                aspectRatio: '1 / 1'
                              }}
                              title={!isSharedView ? 'Change color' : undefined}
                            />
                            {isEditMode && !isSharedView ? (
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
                          {isEditMode && !isSharedView ? (
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
                          {isEditMode && !isSharedView ? (
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
                          {isEditMode && !isSharedView ? (
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
                        {isEditMode && !isSharedView && (
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
                {/* Add Player Row - shown only in edit mode */}
                {isEditMode && !isSharedView && (
                  <tr className="bg-white">
                    <td className="px-7 sm:px-6 py-1.5 sm:py-3 pb-4 sm:pb-3 whitespace-nowrap text-left bg-white" colSpan={7}>
                      <div className="border-2 border-dashed border-gray-400 rounded bg-gray-50">
                        <button
                          onClick={addPlayer}
                          className="flex items-center space-x-1.5 sm:space-x-2 text-left w-full text-gray-700 hover:text-gray-900 transition-colors text-sm sm:text-base px-4 sm:px-6 py-1.5 sm:py-3 bg-gray-50"
                        >
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>{tTracker('addPlayer')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Game Tabs (like Excel sheets) */}
          {!isSharedView && (
            <div className="border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4 px-1 sm:px-0">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={gameTabs.map(tab => tab.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto sm:overflow-x-visible pb-2" style={{ touchAction: 'pan-y' }}>
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
                    {/* Add Tab button styled like a tab with dotted border */}
                    <button
                      onClick={addTab}
                      className="group flex items-center justify-center space-x-1 sm:space-x-2 px-1 sm:px-3 py-0 sm:py-1.5 cursor-pointer transition-colors text-xs sm:text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-b-lg border border-dashed border-gray-400 h-[30px] w-[35px] sm:h-auto sm:w-auto box-border"
                      style={{ minHeight: '30px', maxHeight: '30px' }}
                      title={tTracker('addTab')}
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </SortableContext>
                <DragOverlay>
                  {editingTabId ? (
                    <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-300 text-gray-700 rounded-none sm:rounded-b-lg opacity-80">
                      <GripVertical className="w-3 h-3" />
                      <span className="text-xs sm:text-sm font-medium">{editingTabName}</span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
              <div className="flex items-center justify-end gap-2 mt-2 flex-wrap">
                {isEditMode && (
                  <button
                    onClick={duplicateTab}
                    className="flex items-center space-x-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                  >
                    <CopyIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">{tTracker('duplicateSheet')}</span>
                  </button>
                )}
                {/* Edit and Save buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs sm:text-sm flex-shrink-0"
                  >
                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{isEditMode ? tTracker('exitEdit') : tTracker('edit')}</span>
                  </button>
                  <button
                    onClick={saveTracker}
                    disabled={isSaving}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm flex-shrink-0"
                  >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{isSaving ? tTracker('saving') : tTracker('save')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {isSharedView && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {gameTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 cursor-pointer transition-colors ${
                      activeTabId === tab.id
                        ? 'bg-[#fbae17] text-white rounded-none sm:rounded-b-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-none sm:rounded-b-lg'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium">{tab.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Victory Chart */}
        {playersWithVictories.length > 0 && (
          <div className="bg-white rounded-none sm:rounded-lg shadow-sm border border-gray-200 p-2 sm:p-6 pb-4 sm:pb-8 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4 px-1 sm:px-0">
              <h2 className="text-base sm:text-xl font-bold text-gray-900">{tTracker('victoryChart')}</h2>
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
                  className={`px-3 py-1 rounded-none sm:rounded-md text-xs sm:text-sm transition-colors ${
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

        {/* Share Section */}
        {shareUrl && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{tTracker('shareTitle')}</h3>
            <div className="flex items-center space-x-2 px-4 py-3 bg-gray-50 rounded-md border border-gray-200 mb-4">
              <Share2 className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none"
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

      {/* Delete Tab Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteTabConfirm}
        onClose={() => {
          setShowDeleteTabConfirm(false);
          setTabToDelete(null);
        }}
        onConfirm={confirmDeleteTab}
        title={tTracker('deleteTab')}
        message={tTracker('confirmDeleteTab')}
        confirmText={tTracker('delete')}
        cancelText={tTracker('cancel')}
        type="danger"
      />

      {/* Color Picker Modal */}
      {showColorPicker && playerForColorChange !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center" 
          onClick={() => {
            setShowColorPicker(false);
            setPlayerForColorChange(null);
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 relative" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                setShowColorPicker(false);
                setPlayerForColorChange(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-4 pr-8">{tTracker('selectPlayerColor')}</h3>
            <div className="flex flex-col items-center space-y-4 mb-4">
              <div className="relative w-24 h-24">
                <input
                  type="color"
                  value={activeTab?.players[playerForColorChange]?.color || PLAYER_COLORS[playerForColorChange % PLAYER_COLORS.length] || '#000000'}
                  onChange={(e) => {
                    if (playerForColorChange !== null) {
                      updatePlayer(playerForColorChange, 'color', e.target.value);
                    }
                  }}
                  className="absolute inset-0 w-full h-full cursor-pointer rounded-full border-2 border-gray-300 opacity-0 z-10"
                  style={{ 
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                  }}
                />
                <div
                  className="absolute inset-0 w-full h-full rounded-full border-2 border-gray-300 pointer-events-none"
                  style={{
                    backgroundColor: activeTab?.players[playerForColorChange]?.color || PLAYER_COLORS[playerForColorChange % PLAYER_COLORS.length] || '#000000'
                  }}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tTracker('colorHexCode')}
                </label>
                <input
                  type="text"
                  value={activeTab?.players[playerForColorChange]?.color || PLAYER_COLORS[playerForColorChange % PLAYER_COLORS.length] || '#000000'}
                  onChange={(e) => {
                    if (playerForColorChange !== null && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                      updatePlayer(playerForColorChange, 'color', e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fbae17] text-gray-900"
                  placeholder="#000000"
                  pattern="^#[0-9A-F]{6}$"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(false);
                  setPlayerForColorChange(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-none sm:rounded-md hover:bg-gray-300 transition-colors"
              >
                {tTracker('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(false);
                  setPlayerForColorChange(null);
                }}
                className="flex-1 px-4 py-2 bg-[#fbae17] text-white rounded-none sm:rounded-md hover:bg-[#e0990f] transition-colors"
              >
                {tTracker('saveColor')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple SVG Pie Chart Component
function VictoryPieChart({ players, totalVictories, tTracker }: { players: Player[]; totalVictories: number; tTracker: any }) {
  const size = typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(250, window.innerWidth - 40) : 300;
  const radius = size * 0.4;
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
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-8 w-full max-w-full overflow-hidden pb-2 sm:pb-4">
              <svg width={size} height={size} className="flex-shrink-0 max-w-full" viewBox={`0 0 ${size} ${size}`}>
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
  const maxBarWidth = 100;
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
