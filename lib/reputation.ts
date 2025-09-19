import fs from 'fs';
import path from 'path';

// File path for storing XP data
const XP_FILE = path.join(process.cwd(), 'data', 'xp.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(XP_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load XP data from file
const loadXPData = (): Record<string, UserXP> => {
  try {
    ensureDataDirectory();
    if (fs.existsSync(XP_FILE)) {
      const data = fs.readFileSync(XP_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading XP data:', error);
  }
  return {};
};

// Save XP data to file
const saveXPData = (xpData: Record<string, UserXP>) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(XP_FILE, JSON.stringify(xpData, null, 2));
  } catch (error) {
    console.error('Error saving XP data:', error);
  }
};

// Level definitions
export const LEVELS = [
  { level: 1, name: 'Commoner', xpRequired: 0 },
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
  UPLOAD_IMAGE: { xp: 10, description: 'Upload an image to the gallery' },
  UPLOAD_DIE_DESIGN: { xp: 10, description: 'Upload a new die design' },
  WIN_DICE_THRONE_VOTE: { xp: 20, description: 'Win a Dice Throne vote' }
};

export interface UserXP {
  userId: string;
  username: string;
  xp: number;
  level: number;
  levelName: string;
  actions: XPHistoryEntry[];
  lastLogin?: string;
}

export interface XPHistoryEntry {
  action: string;
  xp: number;
  description: string;
  timestamp: string;
  relatedId?: string;
}

// Initialize XP data
let xpData: Record<string, UserXP> = loadXPData();

// Helper function to calculate level from XP
export function calculateLevel(xp: number): { level: number; levelName: string } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return {
        level: LEVELS[i].level,
        levelName: LEVELS[i].name
      };
    }
  }
  return { level: 1, levelName: 'Commoner' };
}

// Helper function to get XP needed for next level
export function getXPForNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const nextLevel = LEVELS.find(level => level.level === currentLevel.level + 1);
  
  if (!nextLevel) {
    return 0; // Already at max level
  }
  
  return nextLevel.xpRequired - currentXP;
}

// Award XP to a user
export function awardXP(
  userId: string,
  username: string,
  action: keyof typeof XP_ACTIONS,
  relatedId?: string
): { userXP: UserXP | null; leveledUp: boolean; newLevel?: number } {
  const xpAction = XP_ACTIONS[action];
  if (!xpAction) {
    console.error(`Invalid XP action: ${action}`);
    return { userXP: null, leveledUp: false };
  }

  // Get or create user XP data
  let userXP = xpData[userId];
  if (!userXP) {
    userXP = {
      userId,
      username,
      xp: 0,
      level: 1,
      levelName: 'Commoner',
      actions: []
    };
  }

  // Check daily limits for specific actions
  const today = new Date().toDateString();
  const todayActions = userXP.actions.filter(entry => 
    new Date(entry.timestamp).toDateString() === today
  );

  // Check daily action limits (how many times per day)
  const dailyActionLimits = {
    'CREATE_POST': REPUTATION_RULES.DAILY_POST_LIMIT,
    'CREATE_COMMENT': REPUTATION_RULES.DAILY_COMMENT_LIMIT,
    'COMMENT_GALLERY': REPUTATION_RULES.DAILY_COMMENT_LIMIT,
    'UPLOAD_IMAGE': REPUTATION_RULES.DAILY_IMAGE_LIMIT,
    'DAILY_LOGIN': REPUTATION_RULES.DAILY_LOGIN_LIMIT
    // Note: Voting actions (VOTE_GAME, POST_GETS_LIKE, etc.) don't have daily limits
    // since they don't award XP to the voter, only to the content creator
  };

  // Check daily XP limits (how many give XP per day)
  const dailyXPLimits = {
    'CREATE_POST': REPUTATION_RULES.DAILY_POST_XP_LIMIT,
    'CREATE_COMMENT': REPUTATION_RULES.DAILY_COMMENT_XP_LIMIT,
    'COMMENT_GALLERY': REPUTATION_RULES.DAILY_COMMENT_XP_LIMIT,
    'UPLOAD_IMAGE': REPUTATION_RULES.DAILY_IMAGE_XP_LIMIT,
    'DAILY_LOGIN': REPUTATION_RULES.DAILY_LOGIN_XP_LIMIT,
    'POST_GETS_LIKE': REPUTATION_RULES.DAILY_LIKE_XP_LIMIT,
    'COMMENT_GETS_LIKE': REPUTATION_RULES.DAILY_LIKE_XP_LIMIT,
    'VOTE_GAME': REPUTATION_RULES.DAILY_VOTE_XP_LIMIT
  };

  // Check if user has exceeded daily action limit
  const dailyActionLimit = dailyActionLimits[action];
  if (dailyActionLimit) {
    const todayActionCount = todayActions.filter(entry => entry.action === action).length;
    if (todayActionCount >= dailyActionLimit) {
      console.log(`Daily action limit reached for ${action}: ${todayActionCount}/${dailyActionLimit}`);
      return { userXP, leveledUp: false, dailyLimitReached: true };
    }
  }

  // Check if user has exceeded daily XP limit (only award XP if under limit)
  const dailyXPLimit = dailyXPLimits[action];
  let shouldAwardXP = true;
  if (dailyXPLimit) {
    // For like actions, count total XP earned from likes, not number of likes
    if (action === 'POST_GETS_LIKE' || action === 'COMMENT_GETS_LIKE') {
      const todayLikeXP = todayActions
        .filter(entry => entry.action === action)
        .reduce((total, entry) => total + entry.xp, 0);
      if (todayLikeXP >= dailyXPLimit) {
        console.log(`Daily like XP limit reached: ${todayLikeXP}/${dailyXPLimit} - no XP awarded`);
        shouldAwardXP = false;
      }
    } else if (action === 'VOTE_GAME') {
      const todayVoteXP = todayActions
        .filter(entry => entry.action === action)
        .reduce((total, entry) => total + entry.xp, 0);
      if (todayVoteXP >= dailyXPLimit) {
        console.log(`Daily vote XP limit reached: ${todayVoteXP}/${dailyXPLimit} - no XP awarded`);
        shouldAwardXP = false;
      }
    } else {
      // For other actions, count number of actions
      const todayActionCount = todayActions.filter(entry => entry.action === action).length;
      if (todayActionCount >= dailyXPLimit) {
        console.log(`Daily XP limit reached for ${action}: ${todayActionCount}/${dailyXPLimit} - no XP awarded`);
        shouldAwardXP = false;
      }
    }
  }

  // Check for rapid-fire spam (same action within 5 seconds)
  const recentActions = userXP.actions.filter(entry => {
    const timeDiff = Date.now() - new Date(entry.timestamp).getTime();
    return timeDiff < 5000; // 5 seconds
  });

  if (recentActions.length > 0) {
    console.log(`Spam prevention: Action ${action} blocked due to recent activity`);
    return { userXP, leveledUp: false, spamBlocked: true };
  }

  // Add XP only if within daily XP limit
  const oldXP = userXP.xp;
  if (shouldAwardXP) {
    userXP.xp += xpAction.xp;
  }

  // Calculate new level
  const newLevel = calculateLevel(userXP.xp);
  userXP.level = newLevel.level;
  userXP.levelName = newLevel.levelName;

  // Add action to history
  const historyEntry: XPHistoryEntry = {
    action,
    xp: shouldAwardXP ? xpAction.xp : 0,
    description: shouldAwardXP ? xpAction.description : `${xpAction.description} (no XP - daily limit reached)`,
    timestamp: new Date().toISOString(),
    relatedId
  };

  userXP.actions.push(historyEntry);

  // Update last login for daily login action
  if (action === 'DAILY_LOGIN') {
    userXP.lastLogin = new Date().toISOString();
  }

  // Save to file
  xpData[userId] = userXP;
  saveXPData(xpData);

  // Check if level up occurred
  const leveledUp = newLevel.level > calculateLevel(oldXP).level;
  
  // Log level up if it happened
  if (leveledUp) {
    console.log(`🎉 ${username} leveled up to ${newLevel.name}! (Level ${newLevel.level})`);
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

// Get user XP data
export function getUserXP(userId: string): UserXP | null {
  return xpData[userId] || null;
}

// Get all users XP data
export function getAllUsersXP(): UserXP[] {
  return Object.values(xpData);
}

// Get top users by XP
export function getTopUsersByXP(limit: number = 10): UserXP[] {
  return Object.values(xpData)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

// Get user's XP history
export function getUserXPHistory(userId: string, limit: number = 50): XPHistoryEntry[] {
  const userXP = xpData[userId];
  if (!userXP) return [];

  return userXP.actions
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// Check if user can perform daily login
export function canPerformDailyLogin(userId: string): boolean {
  const userXP = xpData[userId];
  if (!userXP) return true; // New user can always login

  const today = new Date().toDateString();
  const lastLogin = userXP.lastLogin ? new Date(userXP.lastLogin).toDateString() : null;

  return lastLogin !== today;
}

// Get level progress information
export function getLevelProgress(userId: string): {
  currentLevel: number;
  currentLevelName: string;
  currentXP: number;
  xpForNextLevel: number;
  progressPercentage: number;
} {
  const userXP = getUserXP(userId);
  if (!userXP) {
    return {
      currentLevel: 1,
      currentLevelName: 'Commoner',
      currentXP: 0,
      xpForNextLevel: 100,
      progressPercentage: 0
    };
  }

  const currentLevel = calculateLevel(userXP.xp);
  const xpForNextLevel = getXPForNextLevel(userXP.xp);
  
  // Calculate progress percentage
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
