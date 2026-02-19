'use client';

import { useEffect, useState } from 'react';
import { Canvas } from './r3f-wrapper';
import { Environment, View } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import DiceMesh from './DiceMesh';

export default function DicePoolPreviewCanvas({ dicePool, rollSignal, rollResults, onComplete, previewRefs }) {
  const [isClient, setIsClient] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let rafId;
    const checkReady = () => {
      const allReady = dicePool.every((dice) => previewRefs.get(dice.id)?.current);
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
  }, [isClient, dicePool, previewRefs]);

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
      onScroll();
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      };
    }, [invalidate]);
    return null;
  };

  /** Keep frame loop running during roll animation (fixes freeze in WebView/app when frameloop=demand). */
  const RollInvalidate = () => {
    const { invalidate } = useThree();
    useEffect(() => {
      if (!rollSignal) return;
      const rollDurationMs = 2600; // SPIN_DURATION 1.3 + SETTLE_DURATION 0.6 + buffer
      const endAt = performance.now() + rollDurationMs;
      let rafId;
      const tick = () => {
        invalidate();
        if (performance.now() < endAt) {
          rafId = requestAnimationFrame(tick);
        }
      };
      rafId = requestAnimationFrame(tick);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [rollSignal, invalidate]);
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
      <RollInvalidate />
      <View.Port />
      {ready &&
        dicePool.map((dice, index) => (
          <View key={dice.id} track={previewRefs.get(dice.id)}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[4, 6, 4]} intensity={1.2} />
            <Environment preset="studio" />
            <group scale={0.9} position={[0, -0.2, 0]}>
              <DiceMesh
                dice={dice}
                rollSignal={rollSignal}
                rollResult={rollResults[index] || null}
                onComplete={onComplete}
              />
            </group>
          </View>
        ))}
    </Canvas>
  );
}
