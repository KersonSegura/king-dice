import { describe, it, expect } from 'vitest';
import { calculateLevel, getXPForNextLevel, LEVELS } from '@/lib/level-utils';

describe('calculateLevel', () => {
  it('returns level 1 (Commoner) for 0 XP', () => {
    expect(calculateLevel(0)).toEqual({ level: 1, levelName: 'Commoner' });
  });

  it('returns level 1 for XP just below 100', () => {
    expect(calculateLevel(99)).toEqual({ level: 1, levelName: 'Commoner' });
  });

  it('returns level 2 (Squire) at 100 XP', () => {
    expect(calculateLevel(100)).toEqual({ level: 2, levelName: 'Squire' });
  });

  it('returns level 3 (Knight) at 250 XP', () => {
    expect(calculateLevel(250)).toEqual({ level: 3, levelName: 'Knight' });
  });

  it('returns level 4 (Champion) at 500 XP', () => {
    expect(calculateLevel(500)).toEqual({ level: 4, levelName: 'Champion' });
  });

  it('returns level 10 (King/Queen) at 6000+ XP', () => {
    expect(calculateLevel(6000)).toEqual({ level: 10, levelName: 'King/Queen' });
    expect(calculateLevel(100000)).toEqual({ level: 10, levelName: 'King/Queen' });
  });

  it('returns correct level for boundaries between levels', () => {
    expect(calculateLevel(899)).toEqual({ level: 4, levelName: 'Champion' });
    expect(calculateLevel(900)).toEqual({ level: 5, levelName: 'Baron/Baroness' });
  });
});

describe('getXPForNextLevel', () => {
  it('returns 100 for 0 XP (need 100 to reach level 2)', () => {
    expect(getXPForNextLevel(0)).toBe(100);
  });

  it('returns 50 for 50 XP', () => {
    expect(getXPForNextLevel(50)).toBe(50);
  });

  it('returns 0 when at max level', () => {
    expect(getXPForNextLevel(6000)).toBe(0);
    expect(getXPForNextLevel(99999)).toBe(0);
  });

  it('returns correct XP needed for next level at boundaries', () => {
    expect(getXPForNextLevel(100)).toBe(150); // 250 - 100 for level 3
    expect(getXPForNextLevel(5999)).toBe(1);  // 6000 - 5999 for level 10
  });
});
