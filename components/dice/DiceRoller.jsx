'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import DiceButton from './DiceButton';
import diceTypes, { DEFAULT_DICE } from './diceTypes';
import { getRandomRoll } from './diceLogic';

const ROLL_ANIMATION_MS = 1000;
const ROLL_TICK_MS = 90;

export default function DiceRoller() {
  const tDiceRoller = useTranslations('diceRoller');
  const [dicePool, setDicePool] = useState([{ ...DEFAULT_DICE, id: Date.now() }]); // Array of dice in the pool with unique IDs
  const [rollResults, setRollResults] = useState([]); // Array of roll results
  const [displayResults, setDisplayResults] = useState([]);
  const [isRolling, setIsRolling] = useState(false);
  const rollIntervalRef = useRef(null);
  const rollTimeoutRef = useRef(null);

  const addDiceToPool = (dice) => {
    if (dicePool.length >= 10) return; // Max 10 dice
    setDicePool([...dicePool, { ...dice, id: Date.now() + Math.random() }]);
  };

  const removeDiceFromPool = (id) => {
    if (dicePool.length <= 1) return; // Keep at least 1 die
    const newPool = dicePool.filter(d => d.id !== id);
    setDicePool(newPool);
    setRollResults([]); // Clear results when pool changes
    setDisplayResults([]);
  };

  const handleRoll = () => {
    if (dicePool.length === 0 || isRolling) return;
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);

    const finalResults = dicePool.map(dice => getRandomRoll(dice.faces));
    setIsRolling(true);
    rollIntervalRef.current = setInterval(() => {
      setDisplayResults(dicePool.map((dice) => getRandomRoll(dice.faces)));
    }, ROLL_TICK_MS);

    rollTimeoutRef.current = setTimeout(() => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setRollResults(finalResults);
      setDisplayResults(finalResults);
      setIsRolling(false);
    }, ROLL_ANIMATION_MS);
  };

  const total = useMemo(() => {
    return rollResults.reduce((sum, result) => sum + result, 0);
  }, [rollResults]);

  useEffect(() => {
    setDisplayResults((prev) => {
      const next = dicePool.map((_, index) => prev[index] ?? null);
      return next;
    });
  }, [dicePool.length]);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  return (
    <section className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300/80">{tDiceRoller('virtualDiceStudio')}</p>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-300 px-2">{tDiceRoller('addDiceToPool')}</h1>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
          {diceTypes.map((dice) => (
            <DiceButton
              key={dice.label}
              dice={dice}
              disabled={isRolling}
              onAdd={() => addDiceToPool(dice)}
              canAdd={dicePool.length < 10}
            />
          ))}
        </div>

        <div className="space-y-6">
          {/* Dice Pool Display */}
          <div className="relative min-h-[400px] rounded-2xl bg-slate-900/60 border border-white/10 p-6">
            {/* Pool Info */}
            <div className="mb-4 text-center">
              <p className="text-sm text-white/60">
                {dicePool.length === 1 
                  ? tDiceRoller('dieInPool', { count: dicePool.length })
                  : tDiceRoller('diceInPool', { count: dicePool.length })}
              </p>
            </div>

            {/* Dice Pool - Display all dice */}
            <style dangerouslySetInnerHTML={{__html: `
              @media (min-width: 768px) {
                .dice-remove-btn {
                  width: 1.5rem !important;
                  height: 1.5rem !important;
                  min-width: 1.5rem !important;
                  max-width: 1.5rem !important;
                  min-height: 1.5rem !important;
                  max-height: 1.5rem !important;
                  font-size: 0.75rem !important;
                }
              }
            `}} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {dicePool.map((dice, index) => {
                const value = displayResults[index];
                return (
                <div key={dice.id} className="relative rounded-2xl border border-white/10 bg-slate-900/40 h-[200px] grid place-items-center overflow-hidden">
                  <div className={clsx('relative h-28 w-28 md:h-32 md:w-32', isRolling && 'animate-pulse')}>
                    <img
                      src={dice.dieSvg}
                      alt={`${dice.label.toUpperCase()} die`}
                      className="h-full w-full object-contain select-none"
                      draggable={false}
                    />
                    <div className="absolute inset-0 grid place-items-center text-white font-black text-4xl md:text-5xl tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
                      {value ?? '?'}
                    </div>
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 text-center text-xs uppercase tracking-wide text-white/70">
                    {dice.label.toUpperCase()}
                  </div>
                  {dicePool.length > 1 && (
                    <button
                      onClick={() => removeDiceFromPool(dice.id)}
                      disabled={isRolling}
                      className="dice-remove-btn absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold transition disabled:opacity-50 z-10"
                      style={{
                        width: '24px',
                        height: '24px',
                        minWidth: '24px',
                        maxWidth: '24px',
                        minHeight: '24px',
                        maxHeight: '24px',
                        fontSize: '12px',
                        padding: '0',
                        margin: '0',
                        flexShrink: '0',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1',
                        textAlign: 'center'
                      }}
                      title={tDiceRoller('removeDie')}
                    >
                      ×
                    </button>
                  )}
                </div>
                );
              })}
            </div>

            {/* Roll Button and Total */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRoll}
                disabled={isRolling || dicePool.length === 0}
                className={`px-8 py-3 rounded-full text-lg font-semibold transition ${
                  isRolling || dicePool.length === 0
                    ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/30'
                }`}
              >
                {isRolling 
                  ? tDiceRoller('rolling')
                  : dicePool.length === 1
                    ? tDiceRoller('rollDie', { count: dicePool.length })
                    : tDiceRoller('rollDice', { count: dicePool.length })}
              </button>
              {rollResults.length > 0 && !isRolling && (
                <div className="text-white font-bold text-xl whitespace-nowrap">
                  {tDiceRoller('total', { total })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

