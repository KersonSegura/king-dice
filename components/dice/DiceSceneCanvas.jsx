'use client';

import { useState, useEffect, Suspense } from 'react';

export default function DiceSceneCanvas({ dice, rollSignal, rollResult, onComplete, compact = false }) {
  const [Canvas, setCanvas] = useState(null);
  const [DiceMesh, setDiceMesh] = useState(null);
  const [ContactShadows, setContactShadows] = useState(null);
  const [Environment, setEnvironment] = useState(null);
  const [OrbitControls, setOrbitControls] = useState(null);
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
        }),
        import('@react-three/drei').then(mod => ({
          ContactShadows: mod.ContactShadows,
          Environment: mod.Environment,
          OrbitControls: mod.OrbitControls
        })).catch(err => {
          console.error('Failed to load @react-three/drei:', err);
          throw err;
        })
      ]).then(([CanvasComponent, DiceMeshComponent, dreiComponents]) => {
        setCanvas(() => CanvasComponent);
        setDiceMesh(() => DiceMeshComponent);
        setContactShadows(() => dreiComponents.ContactShadows);
        setEnvironment(() => dreiComponents.Environment);
        setOrbitControls(() => dreiComponents.OrbitControls);
        setIsLoaded(true);
      }).catch(err => {
        console.error('Error loading 3D components:', err);
        setError(err);
      });
    }, 100);

    return () => clearTimeout(timer);
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

