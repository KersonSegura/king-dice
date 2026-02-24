'use client';

import { Suspense, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Canvas, ContactShadows, Environment } from './r3f-wrapper';
import * as THREE from 'three';

const COIN_URL = '/Models/Coin.glb';
const FLIP_DURATION_MS = 1400;
const SPIN_TURNS = 6;
const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3);

function CoinModel({ flipTrigger, onFlipEnd }) {
  const groupRef = useRef(null);
  const { scene } = useGLTF(COIN_URL);
  const coinClone = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const mat = Array.isArray(child.material) ? child.material[0] : child.material;
          if (mat && mat.color && mat.color.clone) {
            mat.color = mat.color.clone().multiplyScalar(1.45);
          }
        }
      }
    });
    return clone;
  }, [scene]);

  const startTimeRef = useRef(null);
  const startRotationXRef = useRef(0);
  const endRotationXRef = useRef(0);
  const isFlippingRef = useRef(false);

  useEffect(() => {
    if (flipTrigger === 0) return;
    isFlippingRef.current = true;
    startTimeRef.current = null;
    if (groupRef.current) {
      startRotationXRef.current = groupRef.current.rotation.x;
      const tails = Math.random() >= 0.5;
      endRotationXRef.current = startRotationXRef.current + SPIN_TURNS * Math.PI * 2 + (tails ? Math.PI : 0);
    }
  }, [flipTrigger]);

  useFrame((_, delta) => {
    if (!groupRef.current || !isFlippingRef.current) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (startTimeRef.current == null) startTimeRef.current = now;
    const elapsed = now - startTimeRef.current;
    const t = Math.min(elapsed / FLIP_DURATION_MS, 1);
    const eased = EASE_OUT(t);
    groupRef.current.rotation.x = startRotationXRef.current + eased * (endRotationXRef.current - startRotationXRef.current);
    if (t >= 1) {
      isFlippingRef.current = false;
      onFlipEnd?.();
    }
  });

  const box = useMemo(() => {
    const b = new THREE.Box3().setFromObject(coinClone);
    const size = b.getSize(new THREE.Vector3());
    const center = b.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 1.2 / maxDim : 1;
    return { scale, center };
  }, [coinClone]);

  return (
    <group ref={groupRef} position={[0, 0, 0]} scale={box.scale}>
      <primitive object={coinClone} position={[-box.center.x, -box.center.y, -box.center.z]} />
    </group>
  );
}

export default function CoinFlipScene({ flipTrigger, onFlipEnd, className, style }) {
  return (
    <div className={className} style={style}>
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 45 }}
        shadows
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['transparent']} />
        <ambientLight intensity={0.45} />
        <directionalLight castShadow intensity={1.4} position={[2, 5, 4]} shadow-mapSize-width={512} shadow-mapSize-height={512} />
        <directionalLight intensity={0.5} position={[-2, 2, 2]} />
        <pointLight intensity={0.4} position={[0, 2, 2]} color="#fef3c7" />
        <Suspense fallback={null}>
          <CoinModel flipTrigger={flipTrigger} onFlipEnd={onFlipEnd} />
          <ContactShadows position={[0, -0.92, 0]} opacity={0.35} scale={3.5} blur={2} far={1.2} />
          <Environment preset="studio" intensity={0.6} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(COIN_URL);
