/**
 * Pure level/XP helpers (no DB). Used by lib/reputation and by tests.
 */
const DEFAULT_LEVEL_NAME = 'Commoner';

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
  { level: 10, name: 'King/Queen', xpRequired: 6000 },
];

export function calculateLevel(xp: number): { level: number; levelName: string } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return {
        level: LEVELS[i].level,
        levelName: LEVELS[i].name,
      };
    }
  }
  return { level: 1, levelName: DEFAULT_LEVEL_NAME };
}

export function getXPForNextLevel(currentXP: number): number {
  const currentLevel = calculateLevel(currentXP);
  const nextLevel = LEVELS.find((level) => level.level === currentLevel.level + 1);
  if (!nextLevel) return 0;
  return nextLevel.xpRequired - currentXP;
}
