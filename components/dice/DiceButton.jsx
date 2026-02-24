'use client';

import { useTranslations } from 'next-intl';
import clsx from 'clsx';

export default function DiceButton({ dice, disabled, onAdd, canAdd, isShaking = false }) {
  const tDiceRoller = useTranslations('diceRoller');

  return (
    <div
      className={clsx(
        'dice-option relative flex items-center gap-2 md:gap-4 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 px-2 py-2 md:px-4 md:py-3 w-full min-w-0',
        isShaking && 'animate-[diceOptionShake_320ms_ease-out]'
      )}
    >
      <div className="h-12 w-12 md:h-20 md:w-20 rounded-xl md:rounded-2xl bg-slate-900/60 border border-white/10 flex-shrink-0 grid place-items-center">
        <img
          src={dice.iconSvg}
          alt={`${dice.label.toUpperCase()} icon`}
          className="h-8 w-8 md:h-12 md:w-12 object-contain"
          draggable={false}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm md:text-base text-white">{dice.label.toUpperCase()}</p>
        <p className="text-[10px] md:text-xs uppercase tracking-wide text-white/60 whitespace-nowrap">{tDiceRoller('faces', { count: dice.faces })}</p>
      </div>
      <button
        type="button"
        onClick={() => onAdd?.(dice)}
        disabled={disabled || !canAdd}
        className={clsx(
          'dice-add-btn absolute top-1 right-1 md:relative md:top-0 md:right-0 rounded-full flex items-center justify-center font-bold transition z-10',
          canAdd && !disabled
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/30'
            : 'bg-slate-600 text-slate-300 cursor-not-allowed opacity-50'
        )}
        style={{
          width: '24px',
          height: '24px',
          minWidth: '24px',
          maxWidth: '24px',
          minHeight: '24px',
          maxHeight: '24px',
          fontSize: '14px',
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
        title={canAdd ? tDiceRoller('addToPool', { label: dice.label }) : tDiceRoller('maximumDice')}
      >
        +
      </button>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes diceOptionShake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
        @media (min-width: 768px) {
          .dice-add-btn {
            width: 2.5rem !important;
            height: 2.5rem !important;
            min-width: 2.5rem !important;
            max-width: 2.5rem !important;
            min-height: 2.5rem !important;
            max-height: 2.5rem !important;
            font-size: 1.25rem !important;
          }
        }
      `}} />
    </div>
  );
}

