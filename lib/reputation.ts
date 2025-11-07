import { supabaseAdmin } from '@/lib/supabase';
import { REPUTATION_RULES } from './reputation-constants';

const DEFAULT_LEVEL_NAME = 'Commoner';
const HISTORY_LIMIT_DEFAULT = 50;

// Level definitions
export const LEVELS = [
  { level: 1, name: DEFAULT_LEVEL_NAME, xpRequired: 0 },
  { level: 2, name: 'Squire', xpRequired: 100 },
  { level: 3, name: 'Knight', xpRequired: 250 },
  { level: 4, name: 'Champion', xpRequired: 500 },
  { level: 5, name: 'Baron/Baroness', xpRequired: 900 },
  { level: 6, name: 'Lord/Lady', xpRequired: 1400 },
  { level: 7, name: 'Archmage', xpRequired: 2000 },
  { level: 8, name: 'Duke/Duchess', xpRequired: 2800 },
  { level: 9, name: 'Prince', xpRequired: 4000 },
  { level: 10, name: 'King/Queen', xpRequired: 6000 }
];

// XP action definitions
export const XP_ACTIONS = {
  DAILY_LOGIN: { xp: 2, description: 'Daily login' },
  VOTE_GAME: { xp: 1, description: 'Vote for a game' },
  POST_GETS_LIKE: { xp: 1, description: 'Like received on your post' },
  COMMENT_GETS_LIKE: { xp: 1, description: 'Like received on your comment' },
  REPLY_DISCUSSION: { xp: 1, description: 'Reply to a discussion' },
  CREATE_DISCUSSION: { xp: 5, description: 'Create a new discussion thread' },
  CREATE_POST: { xp: 5, description: 'Create a new discussion thread' },
  CREATE_COMMENT: { xp: 1, description: 'Create a comment' },
  COMMENT_GALLERY: { xp: 1, description: 'Comment on a gallery image' },
  UPLOAD_IMAGE: { xp: 10, description: 'Upload an image to the gallery' },
  IMAGE_GETS_LIKE: { xp: 1, description: 'Like received on your image' },
  UPLOAD_DIE_DESIGN: { xp: 10, description: 'Upload a new die design' },
  WIN_DICE_THRONE_VOTE: { xp: 20, description: 'Win a Dice Throne vote' }
} as const;

export interface XPHistoryEntry {
  action: string;
  xp: number;
  description: string;
  timestamp: string;
  relatedId?: string;
}

export interface UserXP {
  userId: string;
  username: string;
  xp: number;
  level: number;
  levelName: string;
  actions: XPHistoryEntry[];
  lastLogin?: string;
}

interface UserRow {
  user_id: string;
  username: string | null;
  xp: number | null;
  level: number | null;
  level_name: string | null;
  last_login: string | null;
}

interface HistoryRow {
  action: string;
  xp: number;
  description: string | null;
  timestamp: string;
  related_id?: string | null;
}

const DAILY_ACTION_LIMITS: Record<string, number> = {
  CREATE_POST: REPUTATION_RULES.DAILY_POST_LIMIT,
  CREATE_DISCUSSION: REPUTATION_RULES.DAILY_POST_LIMIT,
  CREATE_COMMENT: REPUTATION_RULES.DAILY_COMMENT_LIMIT,
  COMMENT_GALLERY: REPUTATION_RULES.DAILY_COMMENT_LIMIT,
  UPLOAD_IMAGE: REPUTATION_RULES.DAILY_IMAGE_LIMIT,
  DAILY_LOGIN: REPUTATION_RULES.DAILY_LOGIN_LIMIT
};

const DAILY_XP_LIMITS: Record<string, number> = {
  CREATE_POST: REPUTATION_RULES.DAILY_POST_XP_LIMIT,
  CREATE_DISCUSSION: REPUTATION_RULES.DAILY_POST_XP_LIMIT,
  CREATE_COMMENT: REPUTATION_RULES.DAILY_COMMENT_XP_LIMIT,
  COMMENT_GALLERY: REPUTATION_RULES.DAILY_COMMENT_XP_LIMIT,
  UPLOAD_IMAGE: REPUTATION_RULES.DAILY_IMAGE_XP_LIMIT,
  DAILY_LOGIN: REPUTATION_RULES.DAILY_LOGIN_XP_LIMIT,
  POST_GETS_LIKE: REPUTATION_RULES.DAILY_LIKE_XP_LIMIT,
  COMMENT_GETS_LIKE: REPUTATION_RULES.DAILY_LIKE_XP_LIMIT,
  IMAGE_GETS_LIKE: REPUTATION_RULES.DAILY_LIKE_XP_LIMIT,
  VOTE_GAME: REPUTATION_RULES.DAILY_VOTE_XP_LIMIT
};

function mapHistoryRow(row: HistoryRow): XPHistoryEntry {
  return {
    action: row.action,
    xp: row.xp ?? 0,
    description: row.description ?? '',
    timestamp: row.timestamp,
    relatedId: row.related_id ?? undefined
  };
}

function buildUserXP(row: UserRow, actions: XPHistoryEntry[] = []): UserXP {
  return {
    userId: row.user_id,
    username: row.username ?? row.user_id,
    xp: row.xp ?? 0,
    level: row.level ?? 1,
    levelName: row.level_name ?? DEFAULT_LEVEL_NAME,
    actions,
    lastLogin: row.last_login ?? undefined
  };
}

function createDefaultUserRow(userId: string, username: string): UserRow {
  return {
    user_id: userId,
    username,
    xp: 0,
    level: 1,
    level_name: DEFAULT_LEVEL_NAME,
    last_login: null
  };
}

async function fetchUserRow(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabaseAdmin
    .from<UserRow>('user_xp')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user XP row:', error);
    return null;
  }

  return data ?? null;
}

async function fetchUserHistory(userId: string, limit = HISTORY_LIMIT_DEFAULT): Promise<XPHistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from<HistoryRow>('xp_history')
    .select('action, xp, description, timestamp, related_id')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching XP history:', error);
    return [];
  }

  return (data ?? []).map(mapHistoryRow);
}

async function upsertUserRow(row: UserRow) {
  const { error } = await supabaseAdmin.from('user_xp').upsert({
    user_id: row.user_id,
    username: row.username,
    xp: row.xp ?? 0,
    level: row.level ?? 1,
    level_name: row.level_name ?? DEFAULT_LEVEL_NAME,
    last_login: row.last_login
  });

  if (error) {
    console.error('Error upserting user XP row:', error);
  }
}

async function insertHistoryEntry(userId: string, entry: XPHistoryEntry) {
  const { error } = await supabaseAdmin.from('xp_history').insert({
    user_id: userId,
    action: entry.action,
    xp: entry.xp,
    description: entry.description,
    timestamp: entry.timestamp,
    related_id: entry.relatedId ?? null
  });

  if (error) {
    console.error('Error inserting XP history entry:', error);
  }
}

function getStartOfTodayISOString(): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now.toISOString();
}

function calculateDailyCounts(actions: XPHistoryEntry[], action: string) {
  const count = actions.filter(entry => entry.action === action).length;
  const xpTotal = actions
    .filter(entry => entry.action === action)
    .reduce((total, entry) => total + entry.xp, 0);
  return { count, xpTotal };
}

async function getTodayHistory(userId: string): Promise<XPHistoryEntry[]> {
  const startOfToday = getStartOfTodayISOString();
  const { data, error } = await supabaseAdmin
    .from<HistoryRow>('xp_history')
    .select('action, xp, description, timestamp, related_id')
    .eq('user_id', userId)
    .gte('timestamp', startOfToday)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching today\'s XP history:', error);
    return [];
  }

  return (data ?? []).map(mapHistoryRow);
}

async function getRecentHistory(userId: string, limit = 5): Promise<XPHistoryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from<HistoryRow>('xp_history')
    .select('action, xp, description, timestamp, related_id')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent XP history:', error);
    return [];
  }

  return (data ?? []).map(mapHistoryRow);
}

export function calculateLevel(xp: number): { level: number; levelName: string } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return {
        level: LEVELS[i].level,
        levelName: LEVELS[i].name
      };
    }
  }

  return { level: 1, levelName: DEFAULT_LEVEL_NAME };
}

export function getXPForNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const nextLevel = LEVELS.find(level => level.level === currentLevel.level + 1);

  if (!nextLevel) {
    return 0; // Already at max level
  }

  return nextLevel.xpRequired - currentXP;
}

export async function awardXP(
  userId: string,
  username: string,
  action: keyof typeof XP_ACTIONS,
  relatedId?: string
): Promise<{
  userXP: UserXP | null;
  leveledUp: boolean;
  newLevel?: number;
  dailyLimitReached?: boolean;
  spamBlocked?: boolean;
  xpAwarded?: boolean;
}> {
  const xpAction = XP_ACTIONS[action];
  if (!xpAction) {
    console.error(`Invalid XP action: ${action}`);
    return { userXP: null, leveledUp: false };
  }

  const existingRow = await fetchUserRow(userId);
  const baseRow = existingRow ?? createDefaultUserRow(userId, username);

  const todayActions = await getTodayHistory(userId);

  // Daily action limits
  const dailyActionLimit = DAILY_ACTION_LIMITS[action];
  if (dailyActionLimit) {
    const { count } = calculateDailyCounts(todayActions, action);
    if (count >= dailyActionLimit) {
      console.log(`Daily action limit reached for ${action}: ${count}/${dailyActionLimit}`);
      const actions = await fetchUserHistory(userId, HISTORY_LIMIT_DEFAULT);
      return {
        userXP: buildUserXP(baseRow, actions),
        leveledUp: false,
        dailyLimitReached: true,
        xpAwarded: false
      };
    }
  }

  // Daily XP limits
  const dailyXPLimit = DAILY_XP_LIMITS[action];
  let shouldAwardXP = true;
  if (dailyXPLimit) {
    const { count, xpTotal } = calculateDailyCounts(todayActions, action);
    if (action === 'POST_GETS_LIKE' || action === 'COMMENT_GETS_LIKE' || action === 'VOTE_GAME') {
      if (xpTotal >= dailyXPLimit) {
        console.log(`Daily XP limit reached for ${action}: ${xpTotal}/${dailyXPLimit} - no XP awarded`);
        shouldAwardXP = false;
      }
    } else {
      if (count >= dailyXPLimit) {
        console.log(`Daily XP limit reached for ${action}: ${count}/${dailyXPLimit} - no XP awarded`);
        shouldAwardXP = false;
      }
    }
  }

  // Spam prevention (same action within 5 seconds)
  const recentActions = await getRecentHistory(userId, 5);
  const now = Date.now();
  const spamBlocked = recentActions.some(entry => now - new Date(entry.timestamp).getTime() < 5000);
  if (spamBlocked) {
    console.log(`Spam prevention: Action ${action} blocked due to recent activity`);
    const actions = await fetchUserHistory(userId, HISTORY_LIMIT_DEFAULT);
    return {
      userXP: buildUserXP(baseRow, actions),
      leveledUp: false,
      spamBlocked: true,
      xpAwarded: false
    };
  }

  const oldXP = baseRow.xp ?? 0;
  const xpAwarded = shouldAwardXP ? xpAction.xp : 0;
  const newXP = oldXP + xpAwarded;

  const newLevel = calculateLevel(newXP);

  const historyEntry: XPHistoryEntry = {
    action,
    xp: xpAwarded,
    description: shouldAwardXP ? xpAction.description : `${xpAction.description} (no XP - daily limit reached)` ,
    timestamp: new Date().toISOString(),
    relatedId
  };

  // Save history (best effort)
  await insertHistoryEntry(userId, historyEntry);

  // Update user row
  const updatedRow: UserRow = {
    user_id: baseRow.user_id,
    username,
    xp: newXP,
    level: newLevel.level,
    level_name: newLevel.levelName,
    last_login: action === 'DAILY_LOGIN' ? historyEntry.timestamp : baseRow.last_login
  };

  await upsertUserRow(updatedRow);

  // Fetch refreshed data for response
  const actions = await fetchUserHistory(userId, HISTORY_LIMIT_DEFAULT);
  const userXP = buildUserXP(updatedRow, actions);

  const leveledUp = newLevel.level > (calculateLevel(oldXP).level);

  if (leveledUp) {
    console.log(`🎉 ${username} leveled up to ${newLevel.levelName}! (Level ${newLevel.level})`);
  }

  return {
    userXP,
    leveledUp,
    newLevel: leveledUp ? newLevel.level : undefined,
    dailyLimitReached: false,
    spamBlocked: false,
    xpAwarded: shouldAwardXP
  };
}

export async function getUserXP(userId: string): Promise<UserXP | null> {
  const row = await fetchUserRow(userId);
  if (!row) {
    return null;
  }

  const actions = await fetchUserHistory(userId, HISTORY_LIMIT_DEFAULT);
  return buildUserXP(row, actions);
}

export async function getAllUsersXP(): Promise<UserXP[]> {
  const { data, error } = await supabaseAdmin
    .from<UserRow>('user_xp')
    .select('*');

  if (error) {
    console.error('Error fetching all user XP rows:', error);
    return [];
  }

  return (data ?? []).map(row => buildUserXP(row, []));
}

export async function getTopUsersByXP(limit: number = 10): Promise<UserXP[]> {
  const { data, error } = await supabaseAdmin
    .from<UserRow>('user_xp')
    .select('*')
    .order('xp', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top user XP rows:', error);
    return [];
  }

  return (data ?? []).map(row => buildUserXP(row, []));
}

export async function getUserXPHistory(userId: string, limit: number = 50): Promise<XPHistoryEntry[]> {
  return fetchUserHistory(userId, limit);
}

export async function canPerformDailyLogin(userId: string): Promise<boolean> {
  const row = await fetchUserRow(userId);
  if (!row) {
    return true;
  }

  if (!row.last_login) {
    return true;
  }

  const today = new Date().toDateString();
  const lastLogin = new Date(row.last_login).toDateString();
  return lastLogin !== today;
}

export async function getLevelProgress(userId: string): Promise<{
  currentLevel: number;
  currentLevelName: string;
  currentXP: number;
  xpForNextLevel: number;
  progressPercentage: number;
}> {
  const userXP = await getUserXP(userId);
  if (!userXP) {
    return {
      currentLevel: 1,
      currentLevelName: DEFAULT_LEVEL_NAME,
      currentXP: 0,
      xpForNextLevel: 100,
      progressPercentage: 0
    };
  }

  const currentLevel = calculateLevel(userXP.xp);
  const xpForNextLevel = getXPForNextLevel(userXP.xp);

  const currentLevelXP = LEVELS.find(l => l.level === currentLevel.level)?.xpRequired || 0;
  const nextLevelXP = LEVELS.find(l => l.level === currentLevel.level + 1)?.xpRequired || currentLevelXP;
  const progressInLevel = userXP.xp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = xpNeededForLevel > 0 ? (progressInLevel / xpNeededForLevel) * 100 : 100;

  return {
    currentLevel: currentLevel.level,
    currentLevelName: currentLevel.levelName,
    currentXP: userXP.xp,
    xpForNextLevel,
    progressPercentage: Math.min(100, Math.max(0, progressPercentage))
  };
}
