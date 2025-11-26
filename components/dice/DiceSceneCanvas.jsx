'use client';

// CRITICAL: Import React first to ensure it's available before React Three Fiber
import React, { useState, useEffect, Suspense } from 'react';
// Import React DOM to ensure React internals are fully initialized
import 'react-dom';

export default function DiceSceneCanvas({ dice, rollSignal, rollResult, onComplete, compact = false }) {
  const [Canvas, setCanvas] = useState(null);
  const [DiceMesh, setDiceMesh] = useState(null);
  const [ContactShadows, setContactShadows] = useState(null);
  const [Environment, setEnvironment] = useState(null);
  const [OrbitControls, setOrbitControls] = useState(null);
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
        const [fiberModule, meshModule, dreiModule] = await Promise.all([
          import('@react-three/fiber'),
          import('./DiceMesh'),
          import('@react-three/drei')
        ]);
        
        setCanvas(() => fiberModule.Canvas);
        setDiceMesh(() => meshModule.default);
        setContactShadows(() => dreiModule.ContactShadows);
        setEnvironment(() => dreiModule.Environment);
        setOrbitControls(() => dreiModule.OrbitControls);
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading 3D components:', err);
        setError(err);
      }
    };

    loadComponents();
  }, []);

  const cameraPosition = compact ? [0, 1.5, 2.5] : [0, 2.5, 4];
  const fov = compact ? 50 : 45;

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">3D Load Error</div>;
  }

  if (!isLoaded || !Canvas || !DiceMesh || !ContactShadows || !Environment || !OrbitControls) {
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

