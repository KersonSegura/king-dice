'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

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
  game_tabs: GameTab[] | null;
  created_at: string;
  updated_at: string;
}

export default function UserTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;
  const t = useTranslations('common');
  const tTracker = useTranslations('gameNightTracker');
  const locale = useLocale();
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  
  const [trackerName, setTrackerName] = useState('');
  const [gameTabs, setGameTabs] = useState<GameTab[]>([{ id: 'tab-1', name: 'All Games', players: [] }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [currentTracker, setCurrentTracker] = useState<Tracker | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<keyof Player | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [graphView, setGraphView] = useState<'pie' | 'bar'>('pie');

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
        }
      } else {
        showToast('Tracker not found', 'error');
        router.push('/game-night-tracker');
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
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#fbae17] to-[#e0990f] bg-clip-text text-transparent">
              {trackerName}
            </h2>
            {username && (
              <p className="text-sm text-gray-500 mt-1">by @{username}</p>
            )}
          </div>

          {/* Players Header */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">{tTracker('players')}</h3>
          </div>

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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {tTracker('noPlayers')}
                    </td>
                  </tr>
                ) : (
                  players.map((player, index) => {
                    const isTopWinner = player.victories === maxVictories && maxVictories > 0;
                    return (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 transition-colors ${
                          isTopWinner ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`font-medium ${isTopWinner ? 'text-yellow-700 font-bold' : 'text-gray-900'}`}>
                            {player.name || tTracker('unnamedPlayer')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`${isTopWinner ? 'text-yellow-700 font-bold' : 'text-gray-900'}`}>
                            {player.victories}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-gray-900">
                          {player.gameNights}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-gray-900">
                          {player.gamesPlayed}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900">
                          {player.winRate.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-900 font-semibold">
                          {player.winRatePercentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Game Tabs (view only) */}
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
  const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
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
                fill={colors[index % colors.length]}
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
