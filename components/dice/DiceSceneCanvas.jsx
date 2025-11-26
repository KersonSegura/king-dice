'use client';

import { useState, useEffect, Suspense } from 'react';

export default function DiceSceneCanvas({ dice, rollSignal, rollResult, onComplete, compact = false }) {
  const [Canvas, setCanvas] = useState(null);
  const [DiceMesh, setDiceMesh] = useState(null);
  const [ContactShadows, setContactShadows] = useState(null);
  const [Environment, setEnvironment] = useState(null);
  const [OrbitControls, setOrbitControls] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Lazy load React Three Fiber only on client side
    Promise.all([
      import('@react-three/fiber').then(mod => mod.Canvas),
      import('./DiceMesh').then(mod => mod.default),
      import('@react-three/drei').then(mod => ({
        ContactShadows: mod.ContactShadows,
        Environment: mod.Environment,
        OrbitControls: mod.OrbitControls
      }))
    ]).then(([CanvasComponent, DiceMeshComponent, dreiComponents]) => {
      setCanvas(() => CanvasComponent);
      setDiceMesh(() => DiceMeshComponent);
      setContactShadows(() => dreiComponents.ContactShadows);
      setEnvironment(() => dreiComponents.Environment);
      setOrbitControls(() => dreiComponents.OrbitControls);
      setIsLoaded(true);
    });
  }, []);

  const cameraPosition = compact ? [0, 1.5, 2.5] : [0, 2.5, 4];
  const fov = compact ? 50 : 45;

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

