'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import DiceButton from './DiceButton';
import diceTypes, { DEFAULT_DICE } from './diceTypes';
import { getRandomRoll } from './diceLogic';

const CoinFlipScene = dynamic(() => import('./CoinFlipScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[280px] rounded-xl flex items-center justify-center">
      <span className="text-white/60">Loading coin...</span>
    </div>
  ),
});

const ROLL_ANIMATION_MS = 1000;
const ROLL_TICK_MS = 80;
const TIMER_PRESETS = [
  { key: '30s', labelKey: 'timerPreset30s', seconds: 30 },
  { key: '1m', labelKey: 'timerPreset1m', seconds: 60 },
  { key: '2m', labelKey: 'timerPreset2m', seconds: 120 },
  { key: '5m', labelKey: 'timerPreset5m', seconds: 300 },
  { key: 'custom', labelKey: 'timerPresetCustom', seconds: null },
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
  const [dicePool, setDicePool] = useState([{ ...DEFAULT_DICE, id: Date.now(), hasRolled: false }]); // Array of dice in the pool with unique IDs
  const [rollResults, setRollResults] = useState([]); // Array of roll results
  const [slotIndices, setSlotIndices] = useState([0]);
  const [isRolling, setIsRolling] = useState(false);
  const rollIntervalRef = useRef(null);
  const rollTimeoutRef = useRef(null);
  const [activeTool, setActiveTool] = useState('dice');
  const [selectedTimerKey, setSelectedTimerKey] = useState('30s');
  const [customMinutes, setCustomMinutes] = useState(0);
  const [customSeconds, setCustomSeconds] = useState(30);
  const [timerDuration, setTimerDuration] = useState(30);
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSoundMuted, setTimerSoundMuted] = useState(false);
  const timerDoneRef = useRef(false);
  const [coinFlipTrigger, setCoinFlipTrigger] = useState(0);

  const totalFromCustom = customMinutes * 60 + customSeconds;
  const clampCustom = (mins, secs) => {
    const m = Math.max(0, Math.min(59, mins));
    const s = Math.max(0, Math.min(59, secs));
    return { mins: m, secs: s };
  };
  const setCustomMinutesClamped = (v) => {
    const { mins } = clampCustom(v, customSeconds);
    setCustomMinutes(mins);
    if (selectedTimerKey === 'custom') {
      const total = Math.max(1, mins * 60 + customSeconds);
      setTimerDuration(total);
      if (!isTimerRunning) setRemainingSeconds(total);
    }
  };
  const setCustomSecondsClamped = (v) => {
    const { secs } = clampCustom(customMinutes, v);
    setCustomSeconds(secs);
    if (selectedTimerKey === 'custom') {
      const total = Math.max(1, customMinutes * 60 + secs);
      setTimerDuration(total);
      if (!isTimerRunning) setRemainingSeconds(total);
    }
  };

  const addDiceToPool = (dice) => {
    if (dicePool.length >= 10) return; // Max 10 dice
    setDicePool([...dicePool, { ...dice, id: Date.now() + Math.random(), hasRolled: false }]);
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
      setDicePool((prev) => prev.map((d) => (d.hasRolled ? d : { ...d, hasRolled: true })));
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
        if (!timerSoundMuted) {
          try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) {
              const ctx = new Ctx();
              const playTone = (freq, start, duration, vol) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(vol, start + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + duration);
              };
              const t = ctx.currentTime;
              playTone(523.25, t, 0.12, 0.12);
              playTone(659.25, t + 0.14, 0.18, 0.1);
            }
          } catch (_) {}
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      }
    }
    if (remainingSeconds > 0) {
      timerDoneRef.current = false;
    }
  }, [remainingSeconds, isTimerRunning, timerSoundMuted]);

  const handleTimerPreset = (presetKey) => {
    setSelectedTimerKey(presetKey);
    setIsTimerRunning(false);
    timerDoneRef.current = false;

    if (presetKey === 'custom') {
      const total = Math.min(59 * 60 + 59, Math.max(1, timerDuration));
      const mins = Math.min(59, Math.floor(total / 60));
      const secs = total % 60;
      setCustomMinutes(mins);
      setCustomSeconds(secs);
      setTimerDuration(total);
      setRemainingSeconds(total);
      return;
    }

    const preset = TIMER_PRESETS.find((p) => p.key === presetKey);
    if (!preset || preset.seconds == null) return;
    setTimerDuration(preset.seconds);
    setRemainingSeconds(preset.seconds);
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
        <div className="text-center">
          <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-slate-300 px-2">Virtual Tools</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setActiveTool('dice')}
            className={clsx(
              'rounded-xl border px-4 py-3 font-semibold transition flex items-center justify-center gap-2',
              activeTool === 'dice'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/60 text-slate-200 border-white/10 hover:border-white/30'
            )}
          >
            <img src={activeTool === 'dice' ? '/DiceIconOn.svg' : '/DiceIconOff.svg'} alt="" className="w-6 h-6" aria-hidden />
            <span>{tDiceRoller('tabDice')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('coin')}
            className={clsx(
              'rounded-xl border px-4 py-3 font-semibold transition flex items-center justify-center gap-2',
              activeTool === 'coin'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/60 text-slate-200 border-white/10 hover:border-white/30'
            )}
          >
            <img src={activeTool === 'coin' ? '/CoinIconOn.svg' : '/CoinIconOff.svg'} alt="" className="w-6 h-6" aria-hidden />
            <span>{tDiceRoller('tabCoinFlip')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('timer')}
            className={clsx(
              'rounded-xl border px-4 py-3 font-semibold transition flex items-center justify-center gap-2',
              activeTool === 'timer'
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900/60 text-slate-200 border-white/10 hover:border-white/30'
            )}
          >
            <img src={activeTool === 'timer' ? '/TimerIconOn.svg' : '/TimerIconOff.svg'} alt="" className="w-6 h-6" aria-hidden />
            <span>{tDiceRoller('tabTimer')}</span>
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
                    const showQuestionMark = !isRolling && !dice.hasRolled;
                    return (
                    <div key={dice.id} className="relative rounded-2xl border border-white/10 bg-slate-900/40 h-[200px] grid place-items-center overflow-visible">
                      <div className="relative h-28 w-28 md:h-32 md:w-32">
                        {dice.faces !== 4 && (
                          <img
                            src={dice.dieSvg}
                            alt={`${dice.label.toUpperCase()} die`}
                            className="h-full w-full object-contain select-none"
                            draggable={false}
                          />
                        )}
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                          {showQuestionMark ? (
                            <span className="text-white font-black text-5xl md:text-6xl leading-none tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]">
                              ?
                            </span>
                          ) : (
                            <div className="relative h-11 md:h-14 w-14 md:w-16 overflow-hidden">
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
                                    className="h-11 md:h-14 w-14 md:w-16 min-w-[3.5rem] md:min-w-[4rem] grid place-items-center text-white font-black text-4xl md:text-5xl leading-none tracking-tight drop-shadow-[0_2px_2px_rgba(0,0,0,0.55)]"
                                  >
                                    {num}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
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
          <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-200 text-center mb-4">{tDiceRoller('coinFlipTitle')}</h2>
            <div className="w-full max-w-sm mx-auto aspect-square rounded-xl overflow-hidden" style={{ height: 280 }}>
              <CoinFlipScene
                flipTrigger={coinFlipTrigger}
                onFlipEnd={() => {}}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setCoinFlipTrigger((t) => t + 1)}
                className="px-8 py-3 rounded-full text-lg font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 transition"
              >
                {tDiceRoller('flip')}
              </button>
            </div>
          </div>
        )}

        {activeTool === 'timer' && (
          <div className="relative rounded-2xl bg-slate-900/60 border border-white/10 p-6 md:p-8 space-y-6">
            <button
              type="button"
              onClick={() => setTimerSoundMuted((m) => !m)}
              className={clsx(
                'absolute bottom-4 right-4 p-2 rounded-lg transition',
                timerSoundMuted ? 'text-slate-500 hover:text-slate-400' : 'text-slate-300 hover:text-white'
              )}
              title={timerSoundMuted ? 'Unmute timer sound' : 'Mute timer sound'}
              aria-label={timerSoundMuted ? 'Unmute timer sound' : 'Mute timer sound'}
            >
              {timerSoundMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><line x1="17" y1="9" x2="23" y2="15" strokeWidth={2} /><line x1="23" y1="9" x2="17" y2="15" strokeWidth={2} /></svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              )}
            </button>
            <h2 className="text-xl font-semibold text-slate-200 text-center">{tDiceRoller('timerTitle')}</h2>
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
                  <img src={selectedTimerKey === preset.key ? '/TimerIconOn.svg' : '/TimerIconOff.svg'} alt="" className="w-5 h-5" aria-hidden />
                  <span>{tDiceRoller(preset.labelKey)}</span>
                </button>
              ))}
            </div>

            {selectedTimerKey === 'custom' && (
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCustomMinutesClamped(customMinutes + 1)}
                    disabled={isTimerRunning || customMinutes >= 59}
                    className="p-2 rounded-lg text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition"
                    aria-label="Add 1 minute"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                  </button>
                  <span className="text-4xl md:text-5xl font-black tabular-nums text-white w-14 text-center">{String(customMinutes).padStart(2, '0')}</span>
                  <button
                    type="button"
                    onClick={() => setCustomMinutesClamped(customMinutes - 1)}
                    disabled={isTimerRunning || customMinutes <= 0}
                    className="p-2 rounded-lg text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition"
                    aria-label="Subtract 1 minute"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
                  </button>
                  <span className="text-xs uppercase text-white/50 mt-1">{tDiceRoller('timerMin')}</span>
                </div>
                <span className="text-4xl md:text-5xl font-black text-white/80">:</span>
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCustomSecondsClamped(customSeconds + 1)}
                    disabled={isTimerRunning || customSeconds >= 59}
                    className="p-2 rounded-lg text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition"
                    aria-label="Add 1 second"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>
                  </button>
                  <span className="text-4xl md:text-5xl font-black tabular-nums text-white w-14 text-center">{String(customSeconds).padStart(2, '0')}</span>
                  <button
                    type="button"
                    onClick={() => setCustomSecondsClamped(customSeconds - 1)}
                    disabled={isTimerRunning || customSeconds <= 0}
                    className="p-2 rounded-lg text-white/90 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition"
                    aria-label="Subtract 1 second"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>
                  </button>
                  <span className="text-xs uppercase text-white/50 mt-1">{tDiceRoller('timerSec')}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-6 text-center">
              <div className="text-5xl md:text-6xl font-black tracking-wider text-white tabular-nums">{formatTime(remainingSeconds)}</div>
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
                {tDiceRoller('timerStart')}
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
                {tDiceRoller('timerStop')}
              </button>
              <button
                type="button"
                onClick={restartTimer}
                className="rounded-lg px-5 py-2 font-semibold transition bg-amber-400 hover:bg-amber-300 text-slate-950"
              >
                {tDiceRoller('timerRestart')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

