'use client';

import { useState, useEffect, Suspense } from 'react';
// Use wrapper that ensures React is loaded first
import { Canvas, Environment } from './r3f-wrapper';
import DiceMesh from './DiceMesh';

export default function DiceButtonCanvas({ dice }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="w-full h-full" />;
  }

  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.5], fov: 50 }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />
      <Suspense fallback={null}>
        <group scale={0.75} position={[0, -0.25, 0]}>
          <DiceMesh 
            dice={dice} 
            rollSignal={null}
            rollResult={null}
            onComplete={null}
          />
        </group>
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  );
}

