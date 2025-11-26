'use client';

import { useState, useEffect } from 'react';

export default function DiceButtonCanvas({ dice }) {
  const [Canvas, setCanvas] = useState(null);
  const [DiceMesh, setDiceMesh] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Ensure we're on client and React is fully initialized
    if (typeof window === 'undefined') return;

    // Ensure React is loaded first before React Three Fiber
    const loadComponents = async () => {
      try {
        // First, ensure React is fully loaded
        await import('react');
        await import('react-dom');
        
        // Small delay to ensure React internals are available
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Now load React Three Fiber
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

