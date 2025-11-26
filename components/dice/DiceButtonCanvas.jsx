'use client';

// CRITICAL: Import React first to ensure it's available before React Three Fiber
import React, { useState, useEffect } from 'react';
// Import React DOM to ensure React internals are fully initialized
import 'react-dom';

export default function DiceButtonCanvas({ dice }) {
  const [Canvas, setCanvas] = useState(null);
  const [DiceMesh, setDiceMesh] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ensure we're on client
    if (typeof window === 'undefined') return;

    // Wait for next tick to ensure React is fully initialized
    const loadComponents = async () => {
      try {
        // Wait for React to be fully ready
        await new Promise(resolve => {
          if (typeof window !== 'undefined' && window.React) {
            resolve();
          } else {
            // Wait a bit longer for React to be available
            setTimeout(resolve, 100);
          }
        });
        
        // Now load React Three Fiber - React should be available
        const [fiberModule, meshModule] = await Promise.all([
          import('@react-three/fiber'),
          import('./DiceMesh')
        ]);
        
        setCanvas(() => fiberModule.Canvas);
        setDiceMesh(() => meshModule.default);
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading 3D components:', err);
        setError(err);
      }
    };

    loadComponents();
  }, []);

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">3D Load Error</div>;
  }

  if (!isLoaded || !Canvas || !DiceMesh) {
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

