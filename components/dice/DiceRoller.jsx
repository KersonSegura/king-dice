'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import DiceButton from './DiceButton';
import diceTypes, { DEFAULT_DICE } from './diceTypes';
import { getRandomRoll } from './diceLogic';

const ROLL_ANIMATION_MS = 1000;
const ROLL_TICK_MS = 80;
const TIMER_PRESETS = [
  { key: '30s', label: '30 sec', seconds: 30 },
  { key: '1m', label: '1 min', seconds: 60 },
  { key: '2m', label: '2 min', seconds: 120 },
  { key: '5m', label: '5 min', seconds: 300 },
  { key: 'custom', label: 'Custom', seconds: null },
];

function getFaceSequence(faces) {
  return Array.from({ length: faces }, (_, i) => i + 1);
}

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function DiceRoller() {
  const tDiceRoller = useTranslations('diceRoller');
  const [dicePool, setDicePool] = useState([{ ...DEFAULT_DICE, id: Date.now() }]); // Array of dice in the pool with unique IDs
  const [rollResults, setRollResults] = useState([]); // Array of roll results
  const [slotIndices, setSlotIndices] = useState([0]);
  const [isRolling, setIsRolling] = useState(false);
  const rollIntervalRef = useRef(null);
  const rollTimeoutRef = useRef(null);
  const [activeTool, setActiveTool] = useState('dice');
  const [selectedTimerKey, setSelectedTimerKey] = useState('30s');
  const [customSecondsInput, setCustomSecondsInput] = useState('90');
  const [timerDuration, setTimerDuration] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerDoneRef = useRef(false);

  const addDiceToPool = (dice) => {
    if (dicePool.length >= 10) return; // Max 10 dice
    setDicePool([...dicePool, { ...dice, id: Date.now() + Math.random() }]);
  };

  const removeDiceFromPool = (id) => {
    if (dicePool.length <= 1) return; // Keep at least 1 die
    const newPool = dicePool.filter(d => d.id !== id);
    setDicePool(newPool);
    setRollResults([]); // Clear results when pool changes
    setSlotIndices((prev) => prev.filter((_, index) => newPool[index] !== undefined));
  };

  const handleRoll = () => {
    if (dicePool.length === 0 || isRolling) return;
    if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);

    const finalResults = dicePool.map(dice => getRandomRoll(dice.faces));
    setIsRolling(true);
    rollIntervalRef.current = setInterval(() => {
      setSlotIndices((prev) =>
        dicePool.map((dice, index) => {
          const current = prev[index] ?? 0;
          const jump = 1 + Math.floor(Math.random() * 3);
          return (current + jump) % dice.faces;
        })
      );
    }, ROLL_TICK_MS);

    rollTimeoutRef.current = setTimeout(() => {
      if (rollIntervalRef.current) {
        clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
      }
      setRollResults(finalResults);
      setSlotIndices(finalResults.map((value) => value - 1));
      setIsRolling(false);
    }, ROLL_ANIMATION_MS);
  };

  const total = useMemo(() => {
    return rollResults.reduce((sum, result) => sum + result, 0);
  }, [rollResults]);

  useEffect(() => {
    setSlotIndices((prev) => {
      const next = dicePool.map((dice, index) => {
        const current = prev[index] ?? 0;
        return current % dice.faces;
      });
      return next;
    });
  }, [dicePool]);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) clearInterval(rollIntervalRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isTimerRunning) return;
    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [isTimerRunning]);

  useEffect(() => {
    if (remainingSeconds === 0 && isTimerRunning && !timerDoneRef.current) {
      timerDoneRef.current = true;
      setIsTimerRunning(false);
      if (typeof window !== 'undefined') {
        window.alert('Timer finished');
      }
    }
    if (remainingSeconds > 0) {
      timerDoneRef.current = false;
    }
  }, [remainingSeconds, isTimerRunning]);

  const handleTimerPreset = (presetKey) => {
    setSelectedTimerKey(presetKey);
    setIsTimerRunning(false);
    timerDoneRef.current = false;

    if (presetKey === 'custom') {
      const parsed = Math.max(1, parseInt(customSecondsInput || '1', 10) || 1);
      setTimerDuration(parsed);
      setRemainingSeconds(parsed);
      return;
    }

    const preset = TIMER_PRESETS.find((p) => p.key === presetKey);
    if (!preset || preset.seconds == null) return;
    setTimerDuration(preset.seconds);
    setRemainingSeconds(preset.seconds);
  };

  const applyCustomTimer = () => {
    const parsed = Math.max(1, parseInt(customSecondsInput || '1', 10) || 1);
    setTimerDuration(parsed);
    setRemainingSeconds(parsed);
    setIsTimerRunning(false);
    timerDoneRef.current = false;
  };

  const startTimer = () => {
    if (remainingSeconds <= 0) {
      setRemainingSeconds(timerDuration);
    }
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const restartTimer = () => {
    setRemainingSeconds(timerDuration);
    setIsTimerRunning(false);
    timerDoneRef.current = false;
  };

  return (
    <section className="min-h-screen bg-slate-950 text-white px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-300/80">{tDiceRoller('virtualDiceStudio')}</p>
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-300 px-2">Virtual Tools</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTool('dice')}
            className={clsx(
              'rounded-xl border px-4 py-3 font-semibold transition',
              activeTool === 'dice'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/60 text-slate-200 border-white/10 hover:border-white/30'
            )}
          >
            Dice
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('coin')}
            className={clsx(
              'rounded-xl border px-4 py-3 font-semibold transition',
              activeTool === 'coin'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/60 text-slate-200 border-white/10 hover:border-white/30'
            )}
          >
            Coin Flip
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('timer')}
            className={clsx(
              'rounded-xl border px-4 py-3 font-semibold transition',
              activeTool === 'timer'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/60 text-slate-200 border-white/10 hover:border-white/30'
            )}
          >
            Timer
          </button>
        </div>

        {activeTool === 'dice' && (
          <>
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
                    const slotIndex = slotIndices[index] ?? 0;
                    const values = getFaceSequence(dice.faces);
                    return (
                    <div key={dice.id} className="relative rounded-2xl border border-white/10 bg-slate-900/40 h-[200px] grid place-items-center overflow-visible">
                      <div className="relative h-28 w-28 md:h-32 md:w-32">
                        <img
                          src={dice.dieSvg}
                          alt={`${dice.label.toUpperCase()} die`}
                          className="h-full w-full object-contain select-none"
                          draggable={false}
                        />
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                          <div className="relative h-11 md:h-14 w-10 md:w-12 overflow-hidden">
                            <div
                              className="flex flex-col items-center"
                              style={{
                                transform: `translateY(-${(slotIndex * 100) / dice.faces}%)`,
                                transition: isRolling
                                  ? 'transform 85ms linear'
                                  : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                              }}
                            >
                              {values.map((num) => (
                                <span
                                  key={`${dice.id}-${num}`}
                                  className="h-11 md:h-14 w-10 md:w-12 grid place-items-center text-white font-black text-4xl md:text-5xl leading-none tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]"
                                >
                                  {num}
                                </span>
                              ))}
                            </div>
                          </div>
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
          </>
        )}

        {activeTool === 'coin' && (
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-200 mb-3">Coin Flip</h2>
            <p className="text-slate-400">
              3D coin flip model placeholder. We can plug your model here next and keep the same tab.
            </p>
          </div>
        )}

        {activeTool === 'timer' && (
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-semibold text-slate-200 text-center">Timer</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleTimerPreset(preset.key)}
                  className={clsx(
                    'rounded-xl border px-3 py-3 text-sm font-semibold transition flex items-center justify-center gap-2',
                    selectedTimerKey === preset.key
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-900/40 text-slate-200 border-white/10 hover:border-white/30'
                  )}
                >
                  <span aria-hidden="true">⌛</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>

            {selectedTimerKey === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <label className="flex-1">
                  <span className="block text-sm text-slate-300 mb-1">Custom seconds</span>
                  <input
                    type="number"
                    min={1}
                    value={customSecondsInput}
                    onChange={(e) => setCustomSecondsInput(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2 text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={applyCustomTimer}
                  className="rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold px-4 py-2 transition"
                >
                  Apply
                </button>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 text-center">
              <div className="text-5xl md:text-6xl font-black tracking-wider text-white">{formatTime(remainingSeconds)}</div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={startTimer}
                disabled={isTimerRunning}
                className={clsx(
                  'rounded-lg px-5 py-2 font-semibold transition',
                  isTimerRunning
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-400 text-slate-950'
                )}
              >
                Start
              </button>
              <button
                type="button"
                onClick={stopTimer}
                disabled={!isTimerRunning}
                className={clsx(
                  'rounded-lg px-5 py-2 font-semibold transition',
                  !isTimerRunning
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-400 text-white'
                )}
              >
                Stop
              </button>
              <button
                type="button"
                onClick={restartTimer}
                className="rounded-lg px-5 py-2 font-semibold transition bg-amber-400 hover:bg-amber-300 text-slate-950"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

