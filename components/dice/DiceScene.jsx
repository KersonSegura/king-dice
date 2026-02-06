'use client';

export default function DiceScene({ compact = false, previewRef }) {
  return (
    <div
      ref={previewRef}
      className={`w-full ${compact ? 'h-[200px]' : 'h-[360px]'} rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur relative overflow-hidden`}
    />
  );
}

