'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

export default function DiceButton({ dice, disabled, onAdd, canAdd, previewRef }) {
  const tDiceRoller = useTranslations('diceRoller');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="dice-option relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 pl-3 pr-5 py-3 md:px-6 md:min-w-[280px]">
      <div
        ref={previewRef}
        className="h-20 w-20 rounded-2xl bg-slate-900/60 border border-white/10 flex-shrink-0"
      >
        {!isMounted && <div className="w-full h-full" />}
      </div>
      <div className="flex-1 min-w-0 -ml-2 md:ml-0">
        <p className="font-semibold text-white">{dice.label.toUpperCase()}</p>
        <p className="text-xs uppercase tracking-wide text-white/60 whitespace-nowrap">{tDiceRoller('faces', { count: dice.faces })}</p>
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

