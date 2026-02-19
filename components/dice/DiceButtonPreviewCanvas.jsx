'use client';

import { useState, useEffect } from 'react';
import { Canvas } from './r3f-wrapper';
import { useThree } from '@react-three/fiber';
import { Environment, View } from '@react-three/drei';
import DiceMesh from './DiceMesh';

export default function DiceButtonPreviewCanvas({ diceTypes, previewRefs }) {
  const [isClient, setIsClient] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let rafId;
    const checkReady = () => {
      const allReady = previewRefs.every((ref) => ref && ref.current);
      if (allReady) {
        setReady(true);
        return;
      }
      rafId = requestAnimationFrame(checkReady);
    };
    checkReady();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isClient, previewRefs]);

  if (!isClient) {
    return null;
  }

  const ScrollInvalidate = () => {
    const { invalidate } = useThree();
    useEffect(() => {
      let rafId;
      let keepInvalidatingUntil = 0;
      const onScroll = () => {
        keepInvalidatingUntil = performance.now() + 140;
        const tick = () => {
          invalidate();
          if (performance.now() < keepInvalidatingUntil) {
            rafId = requestAnimationFrame(tick);
          } else {
            rafId = undefined;
          }
        };
        if (!rafId) {
          rafId = requestAnimationFrame(tick);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      // Kick once after mount to ensure initial alignment
      onScroll();
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }, [invalidate]);
    return null;
  };

  return (
    <Canvas
      camera={{ position: [0, 1.5, 2.5], fov: 50 }}
      dpr={[1, 1.5]}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}
      frameloop="demand"
    >
      <ScrollInvalidate />
      <View.Port />
      {ready &&
        diceTypes.map((dice, index) => (
          <View key={dice.label} track={previewRefs[index]}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[4, 6, 4]} intensity={1.2} />
            <Environment preset="studio" />
            <group scale={0.75} position={[0, -0.25, 0]}>
              <DiceMesh
                dice={dice}
                rollSignal={null}
                rollResult={null}
                onComplete={null}
              />
            </group>
          </View>
        ))}
    </Canvas>
  );
}
