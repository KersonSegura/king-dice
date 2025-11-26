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

    // Small delay to ensure React is fully initialized
    const timer = setTimeout(() => {
      Promise.all([
        import('@react-three/fiber').then(mod => mod.Canvas).catch(err => {
          console.error('Failed to load @react-three/fiber:', err);
          throw err;
        }),
        import('./DiceMesh').then(mod => mod.default).catch(err => {
          console.error('Failed to load DiceMesh:', err);
          throw err;
        })
      ]).then(([CanvasComponent, DiceMeshComponent]) => {
        setCanvas(() => CanvasComponent);
        setDiceMesh(() => DiceMeshComponent);
        setIsLoaded(true);
      }).catch(err => {
        console.error('Error loading 3D components:', err);
        setError(err);
      });
    }, 100);

    return () => clearTimeout(timer);
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

