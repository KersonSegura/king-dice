'use client';

// CRITICAL: Import React first to ensure it's available before React Three Fiber
import React, { useState, useEffect, Suspense } from 'react';
// Import React DOM to ensure React internals are initialized
import 'react-dom/client';

// Try importing React Three Fiber at top level - React should be available
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
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

