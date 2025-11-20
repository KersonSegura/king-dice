'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';

type DiceType = {
  label: string;
  faces: number;
  description: string;
  color: string;
  gradient: string;
};

type DieInstance = {
  id: number;
  type: DiceType;
};

type DieResult = DieInstance & { value: number };

type RollRecord = {
  id: number;
  timestamp: number;
  dice: DieResult[];
  total: number;
};

const DICE_PRESETS: DiceType[] = [
  { label: 'd4', faces: 4, description: 'Great for damage modifiers', color: '#F97316', gradient: 'from-orange-400 via-orange-500 to-orange-600' },
  { label: 'd6', faces: 6, description: 'Classic board-game die', color: '#22C55E', gradient: 'from-emerald-400 via-emerald-500 to-emerald-600' },
  { label: 'd8', faces: 8, description: 'Common for spells', color: '#0EA5E9', gradient: 'from-sky-400 via-sky-500 to-sky-600' },
  { label: 'd10', faces: 10, description: 'Percentile rolls & damage', color: '#6366F1', gradient: 'from-indigo-400 via-indigo-500 to-indigo-600' },
  { label: 'd12', faces: 12, description: 'Powerful weapon rolls', color: '#EC4899', gradient: 'from-pink-400 via-pink-500 to-pink-600' },
  { label: 'd20', faces: 20, description: 'Skill checks & attacks', color: '#F97316', gradient: 'from-yellow-400 via-amber-500 to-orange-600' },
  { label: 'd100', faces: 100, description: 'Percentile tables', color: '#14B8A6', gradient: 'from-teal-400 via-teal-500 to-teal-600' }
];

let DIE_ID = 0;

export default function DiceRollerPage() {
  const [dicePool, setDicePool] = useState<DieInstance[]>([]);
  const [currentRoll, setCurrentRoll] = useState<RollRecord | null>(null);
  const [history, setHistory] = useState<RollRecord[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const poolSummary = useMemo(() => {
    const summary = dicePool.reduce<Record<string, number>>((acc, die) => {
      acc[die.type.label] = (acc[die.type.label] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(summary).map(([label, count]) => ({ label, count }));
  }, [dicePool]);

  const stats = useMemo(() => {
    if (!currentRoll || currentRoll.dice.length === 0) {
      return {
        total: 0,
        average: '0.00',
        highest: '-',
        lowest: '-',
        diceCount: 0
      };
    }
    const values = currentRoll.dice.map(die => die.value);
    return {
      total: currentRoll.total,
      average: (currentRoll.total / currentRoll.dice.length).toFixed(2),
      highest: Math.max(...values),
      lowest: Math.min(...values),
      diceCount: currentRoll.dice.length
    };
  }, [currentRoll]);

  const addDie = (type: DiceType) => {
    setDicePool(prev => [...prev, { id: DIE_ID++, type }]);
  };

  const removeDie = (id: number) => {
    setDicePool(prev => prev.filter(die => die.id !== id));
  };

  const clearDice = () => {
    setDicePool([]);
    setCurrentRoll(null);
  };

  const rollDice = () => {
    if (dicePool.length === 0) return;
    setIsRolling(true);

    const diceResults: DieResult[] = dicePool.map(die => ({
      ...die,
      value: Math.floor(Math.random() * die.type.faces) + 1
    }));
    const total = diceResults.reduce((sum, die) => sum + die.value, 0);
    const record: RollRecord = {
      id: Date.now(),
      timestamp: Date.now(),
      dice: diceResults,
      total
    };

    setTimeout(() => {
      setCurrentRoll(record);
      setHistory(prev => [record, ...prev].slice(0, 6));
      setIsRolling(false);
    }, 600);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl border border-white/60 p-8 mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-primary-500 font-semibold uppercase tracking-widest text-sm mb-2">Virtual Dice Studio</p>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900">Roll Beautiful Dice Anytime</h1>
                <p className="text-lg text-gray-600 mt-4 max-w-2xl">
                  Add any combination of dice, animate stunning rolls, and keep a rolling history — all crafted specifically for tabletop gamers.
                </p>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4">
                <Image src="/DiceRollerIcon.svg" alt="Dice Roller Icon" width={48} height={48} className="w-12 h-12" />
                <div>
                  <p className="text-sm text-gray-500">Dice currently queued</p>
                  <p className="text-2xl font-semibold text-gray-900">{dicePool.length}</p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Dice</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {DICE_PRESETS.map(die => (
                  <div key={die.label} className="border border-gray-100 rounded-2xl p-4 flex flex-col justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${die.gradient} shadow-lg shadow-gray-200 flex items-center justify-center text-white font-bold text-lg`}>
                        {die.label.replace('d', '')}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{die.label}</p>
                        <p className="text-sm text-gray-500">{die.faces} faces</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 flex-1">{die.description}</p>
                    <button
                      onClick={() => addDie(die)}
                      className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all shadow-sm"
                      style={{ backgroundColor: die.color }}
                    >
                      Add {die.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Dice Pool</h2>
                <button onClick={clearDice} className="text-sm text-red-500 hover:text-red-600 font-medium" disabled={!dicePool.length}>
                  Clear
                </button>
              </div>
              {dicePool.length === 0 ? (
                <div className="text-gray-500 text-sm bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
                  No dice added yet. Choose dice from the list to start building your roll.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {poolSummary.map(entry => (
                      <div key={entry.label} className="px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-700">
                        {entry.count}× {entry.label}
                      </div>
                    ))}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                    {dicePool.map(die => (
                      <div
                        key={die.id}
                        className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${die.type.gradient} flex items-center justify-center text-white font-bold`}>
                            {die.type.label.replace('d', '')}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{die.type.label}</p>
                            <p className="text-xs text-gray-500">{die.type.faces} faces</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDie(die.id)}
                          className="text-sm text-gray-500 hover:text-red-500 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={rollDice}
                disabled={!dicePool.length || isRolling}
                className={`w-full py-3 rounded-2xl text-white font-semibold text-lg transition-all ${
                  dicePool.length
                    ? 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-200/80'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isRolling ? 'Rolling...' : 'Roll Dice'}
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Live Dice</h2>
                {currentRoll && (
                  <div className="text-sm text-gray-500">
                    Last roll: {new Date(currentRoll.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>

              {dicePool.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-gray-500">
                  <Image src="/DiceRollerIcon.svg" alt="Dice icon" width={56} height={56} className="mb-4 opacity-70" />
                  <p className="text-sm">Add dice to the pool to begin rolling.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {dicePool.map(die => {
                    const rollValue = currentRoll?.dice.find(result => result.id === die.id)?.value;
                    return (
                      <div
                        key={die.id}
                        className={`relative h-32 rounded-3xl p-4 bg-gradient-to-br ${die.type.gradient} text-white shadow-lg overflow-hidden`}
                        style={{ animation: isRolling ? 'dice-shake 0.6s ease infinite' : 'none' }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">{die.type.label}</span>
                          <span className="text-xs uppercase tracking-wide opacity-80">Faces: {die.type.faces}</span>
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-xs uppercase opacity-70 mb-1">Result</span>
                          <span className="text-5xl font-black drop-shadow">{rollValue ?? '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-xl border border-gray-800 space-y-4">
                <h3 className="text-lg font-semibold">Roll Insights</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-wide opacity-70">Total Sum</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-wide opacity-70">Average</p>
                    <p className="text-2xl font-bold">{stats.average}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-wide opacity-70">Highest Die</p>
                    <p className="text-2xl font-bold">{stats.highest}</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-wide opacity-70">Lowest Die</p>
                    <p className="text-2xl font-bold">{stats.lowest}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-300">Dice in roll: {stats.diceCount}</p>
              </div>

              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Rolls</h3>
                  {history.length > 0 && (
                    <span className="text-xs text-gray-500">Showing last {history.length} rolls</span>
                  )}
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500">Roll some dice to build your history.</p>
                ) : (
                  <ul className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {history.map(roll => (
                      <li
                        key={roll.id}
                        className="border border-gray-100 rounded-2xl px-4 py-3 bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {roll.dice.length} dice • total {roll.total}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(roll.timestamp).toLocaleTimeString()} •{' '}
                            {roll.dice.map(d => `${d.type.label}:${d.value}`).join('  ')}
                          </p>
                        </div>
                        <span className="text-lg font-black text-primary-500">{roll.total}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @keyframes dice-shake {
          0% {
            transform: rotate(0deg) translateY(0);
          }
          25% {
            transform: rotate(2deg) translateY(-3px);
          }
          50% {
            transform: rotate(-2deg) translateY(2px);
          }
          75% {
            transform: rotate(1deg) translateY(-1px);
          }
          100% {
            transform: rotate(0deg) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

