'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Canvas component with SSR disabled
const DiceSceneCanvas = dynamic(() => import('./DiceSceneCanvas'), {
  ssr: false,
  loading: () => <div className="w-full h-full" />
});

export default function DiceScene({ dice, rollSignal, rollResult, onComplete, compact = false, mountDelay = 0 }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Stagger mounting to prevent resource conflicts on mobile
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, mountDelay);

    return () => clearTimeout(timer);
  }, [mountDelay]);

  return (
    <div className={`w-full ${compact ? 'h-[200px]' : 'h-[360px]'} rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur relative overflow-hidden`}>
      {isMounted && (
        <DiceSceneCanvas
          dice={dice}
          rollSignal={rollSignal}
          rollResult={rollResult}
          onComplete={onComplete}
          compact={compact}
        />
      )}
    </div>
  );
}

