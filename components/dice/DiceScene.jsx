'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Suspense } from 'react';
import DiceMesh from './DiceMesh';

export default function DiceScene({ dice, rollSignal, rollResult, onComplete, compact = false }) {
  const height = compact ? '200px' : '360px';
  const cameraPosition = compact ? [0, 1.5, 2.5] : [0, 2.5, 4];
  const fov = compact ? 50 : 45;
  
  return (
    <div className={`w-full ${compact ? 'h-[200px]' : 'h-[360px]'} rounded-3xl border border-white/10 bg-slate-900/40 backdrop-blur relative overflow-hidden`}>
      <Canvas
        camera={{ position: cameraPosition, fov }}
        shadows
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={0.8} />
        <directionalLight
          castShadow
          intensity={1.2}
          position={[4, 6, 4]}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <Suspense fallback={null}>
          <DiceMesh
            dice={dice}
            rollSignal={rollSignal}
            rollResult={rollResult}
            onComplete={onComplete}
          />
          <ContactShadows
            position={[0, -1.2, 0]}
            opacity={0.5}
            scale={8}
            blur={2}
          />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
      </Canvas>
    </div>
  );
}

