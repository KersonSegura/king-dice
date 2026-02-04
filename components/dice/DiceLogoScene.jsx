'use client';

import { Suspense } from 'react';
import { Canvas, ContactShadows, Environment } from './r3f-wrapper';
import DiceCrownModels from './DiceCrownModels';
import ModelErrorBoundary from './ModelErrorBoundary';

export default function DiceLogoScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.5], fov: 50 }}
      shadows
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['transparent']} />
      <ambientLight intensity={0.8} />
      <directionalLight
        castShadow
        intensity={1.2}
        position={[4, 6, 4]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <Suspense fallback={null}>
        <ModelErrorBoundary>
          <DiceCrownModels />
        </ModelErrorBoundary>
        <ContactShadows position={[0, -0.85, 0]} opacity={0.5} scale={6.5} blur={2} />
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  );
}
