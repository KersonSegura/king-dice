'use client';

import { useState, useEffect } from 'react';

export default function DiceButtonCanvas({ dice }) {
  const [Canvas, setCanvas] = useState(null);
  const [DiceMesh, setDiceMesh] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Lazy load React Three Fiber only on client side
    Promise.all([
      import('@react-three/fiber').then(mod => mod.Canvas),
      import('./DiceMesh').then(mod => mod.default)
    ]).then(([CanvasComponent, DiceMeshComponent]) => {
      setCanvas(() => CanvasComponent);
      setDiceMesh(() => DiceMeshComponent);
      setIsLoaded(true);
    });
  }, []);

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

