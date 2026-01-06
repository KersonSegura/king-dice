'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import DiceButton from './DiceButton';
import diceTypes, { DEFAULT_DICE } from './diceTypes';
import { getRandomRoll } from './diceLogic';

const DiceScene = dynamic(() => import('./DiceScene'), { ssr: false });

export default function DiceRoller() {
  const tDiceRoller = useTranslations('diceRoller');
  const [dicePool, setDicePool] = useState([{ ...DEFAULT_DICE, id: Date.now() }]); // Array of dice in the pool with unique IDs
  const [rollResults, setRollResults] = useState([]); // Array of roll results
  const [rollSignal, setRollSignal] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const completedCountRef = useRef(0);

  const addDiceToPool = (dice) => {
    if (dicePool.length >= 10) return; // Max 10 dice
    setDicePool([...dicePool, { ...dice, id: Date.now() + Math.random() }]);
  };

  const removeDiceFromPool = (id) => {
    if (dicePool.length <= 1) return; // Keep at least 1 die
    const newPool = dicePool.filter(d => d.id !== id);
    setDicePool(newPool);
    setRollResults([]); // Clear results when pool changes
  };

  const handleRoll = () => {
    if (dicePool.length === 0 || isRolling) return;
    const results = dicePool.map(dice => getRandomRoll(dice.faces));
    setIsRolling(true);
    setRollResults(results);
    completedCountRef.current = 0; // Reset completion counter
    setRollSignal(Date.now());
  };

  const handleDiceComplete = () => {
    completedCountRef.current += 1;
    if (completedCountRef.current >= dicePool.length) {
      setIsRolling(false);
    }
  };

  const total = useMemo(() => {
    return rollResults.reduce((sum, result) => sum + result, 0);
  }, [rollResults]);

  return (
    <section className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300/80">{tDiceRoller('virtualDiceStudio')}</p>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-300 px-2">{tDiceRoller('addDiceToPool')}</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
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
              {dicePool.map((dice, index) => (
                <div key={dice.id} className="relative">
                  <DiceScene
                    dice={dice}
                    rollSignal={rollSignal}
                    rollResult={rollResults[index] || null}
                    onComplete={handleDiceComplete}
                    compact={true}
                    mountDelay={index * 30}
                  />
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
              ))}
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

