'use client';

import { useState, useEffect, Suspense } from 'react';
// Use wrapper that ensures React is loaded first
import { Canvas, ContactShadows, Environment, OrbitControls } from './r3f-wrapper';
import DiceMesh from './DiceMesh';

export default function DiceSceneCanvas({ dice, rollSignal, rollResult, onComplete, compact = false }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const cameraPosition = compact ? [0, 1.5, 2.5] : [0, 2.5, 4];
  const fov = compact ? 50 : 45;

  if (!isClient) {
    return <div className="w-full h-full" />;
  }

  return (
    <Canvas
      key={`canvas-${dice?.id || dice?.label || 'default'}`}
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
  );
}

