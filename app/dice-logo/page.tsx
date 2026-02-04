'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';

const DiceLogoScene = dynamic(() => import('@/components/dice/DiceLogoScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[140px] flex items-center justify-center bg-transparent">
      <div className="w-16 h-16 rounded-lg bg-gray-200 animate-pulse" />
    </div>
  ),
});

export default function DiceLogoPage() {
  return (
    <div
      className="flex flex-col items-center justify-center w-full h-[200px] bg-transparent overflow-hidden"
      style={{ height: 200 }}
    >
      {/* Crown above dice */}
      <div className="mb-[-4px] z-10 flex-shrink-0">
        <Image
          src="/dice/Crowns & Hats/KingsCrown.svg"
          alt=""
          width={48}
          height={34}
          className="object-contain"
        />
      </div>
      {/* 3D Dice - same as Dice Roller D6 */}
      <div className="w-full flex-1 min-h-0 rounded-xl overflow-hidden bg-slate-900/30" style={{ maxWidth: 140 }}>
        <DiceLogoScene />
      </div>
    </div>
  );
}
