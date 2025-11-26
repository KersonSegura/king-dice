'use client';

// CRITICAL: Import React first to ensure it's available before React Three Fiber
import React, { useState, useEffect } from 'react';
// Import React DOM to ensure React internals are initialized
import 'react-dom/client';

// Try importing React Three Fiber at top level - React should be available
import { Canvas } from '@react-three/fiber';
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
    <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 3, 3]} intensity={1.2} />
      <group scale={0.7} position={[0, -0.3, 0]}>
        <DiceMesh 
          dice={dice} 
          rollSignal={null}
          rollResult={null}
          onComplete={null}
        />
      </group>
    </Canvas>
  );
}

