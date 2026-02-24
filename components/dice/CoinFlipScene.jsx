'use client';

import { Suspense, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Canvas } from './r3f-wrapper';
import * as THREE from 'three';

const COIN_URL = '/Models/Coin.glb?v=2';
const FLIP_DURATION_MS = 1400;
const SPIN_TURNS = 6;
const EASE_OUT = (t) => 1 - Math.pow(1 - t, 3);
const COIN_BRIGHTNESS = 1.0;

function cloneAndBrightenMaterial(mat) {
  if (!mat || !mat.clone) return mat;
  const cloned = mat.clone();
  if (cloned.color && cloned.color.clone) {
    cloned.color = cloned.color.clone().multiplyScalar(COIN_BRIGHTNESS);
  }
  return cloned;
}

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
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          child.material = mats.length > 1 ? mats.map((m) => cloneAndBrightenMaterial(m)) : cloneAndBrightenMaterial(mats[0]);
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
    const scale = maxDim > 0 ? Math.min(1.25 / maxDim, 1.75) : 1;
    return { scale, center };
  }, [coinClone]);

  return (
    <group ref={groupRef} position={[0, -0.02, 0]} scale={box.scale}>
      <primitive object={coinClone} position={[-box.center.x, -box.center.y, -box.center.z]} />
    </group>
  );
}

export default function CoinFlipScene({ flipTrigger, onFlipEnd, className, style }) {
  return (
    <div className={className} style={{ ...style, background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0, 1.9], fov: 54 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={0.32} />
        <directionalLight intensity={0.75} position={[2, 4, 3]} />
        <directionalLight intensity={0.22} position={[-2, 2, 2]} />
        <Suspense fallback={null}>
          <CoinModel flipTrigger={flipTrigger} onFlipEnd={onFlipEnd} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(COIN_URL);
