'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const DICE_URL = '/Models/dice/dice_scene.gltf';
const CROWN_URL = '/Models/crown/crownscene.gltf';

const AUTO_ROTATE_SPEED = 0.012;
const DRAG_SENSITIVITY = 0.005;
const X_ROTATION_MIN = -0.8;
const X_ROTATION_MAX = 0.8;

export default function DiceCrownModels() {
  const groupRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastPointerX = useRef(0);
  const dragRotationX = useRef(0);

  const { scene: diceScene } = useGLTF(DICE_URL);
  const { scene: crownScene } = useGLTF(CROWN_URL);

  const { diceClone, crownClone, diceScale, crownScale, diceOffset, crownOffset } = useMemo(() => {
    const dClone = diceScene.clone();
    const cClone = crownScene.clone();

    const box = new THREE.Box3().setFromObject(dClone);
    const diceSize = box.getSize(new THREE.Vector3());
    const diceCenter = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(diceSize.x, diceSize.y, diceSize.z);
    const dScale = maxDim > 0 ? 1.2 / maxDim : 1;

    const crownBox = new THREE.Box3().setFromObject(cClone);
    const crownSize = crownBox.getSize(new THREE.Vector3());
    const crownCenter = crownBox.getCenter(new THREE.Vector3());
    const crownMaxDim = Math.max(crownSize.x, crownSize.y, crownSize.z);
    const cScale = crownMaxDim > 0 ? 0.6 / crownMaxDim : 1;

    const diceOffset = new THREE.Vector3(
      -diceCenter.x * dScale,
      -diceCenter.y * dScale,
      -diceCenter.z * dScale
    );
    const crownOffset = new THREE.Vector3(
      -crownCenter.x * cScale,
      diceSize.y * 0.5 * dScale + crownSize.y * 0.5 * cScale + 0.02,
      -crownCenter.z * cScale
    );

    return { diceClone: dClone, crownClone: cClone, diceScale: dScale, crownScale: cScale, diceOffset, crownOffset };
  }, [diceScene, crownScene]);

  useEffect(() => {
    diceScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    crownScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [diceScene, crownScene]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += AUTO_ROTATE_SPEED;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      dragRotationX.current,
      0.1
    );
  });

  const getClientX = (e) => {
    const ev = e.nativeEvent ?? e;
    return ev?.clientX ?? ev?.touches?.[0]?.clientX ?? 0;
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.pointerId != null) e.target.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    lastPointerX.current = getClientX(e);
    if (typeof document !== 'undefined') document.body.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = getClientX(e);
    const delta = (clientX - lastPointerX.current) * DRAG_SENSITIVITY;
    dragRotationX.current = THREE.MathUtils.clamp(
      dragRotationX.current + delta,
      X_ROTATION_MIN,
      X_ROTATION_MAX
    );
    lastPointerX.current = clientX;
  };

  const handlePointerUp = (e) => {
    if (e.pointerId != null) e.target.releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
    if (typeof document !== 'undefined') document.body.style.cursor = '';
  };

  return (
    <group ref={groupRef} position={[0, 0.3, 0]}>
      {/* Invisible hit target for drag interaction */}
      <mesh
        visible={false}
        position={[0, 0.4, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <sphereGeometry args={[1.2, 16, 16]} />
      </mesh>
      <group position={[diceOffset.x, diceOffset.y, diceOffset.z]} scale={[diceScale, diceScale, diceScale]}>
        <primitive object={diceClone} />
      </group>
      <group position={[crownOffset.x, crownOffset.y, crownOffset.z]} scale={[crownScale, crownScale, crownScale]}>
        <primitive object={crownClone} />
      </group>
    </group>
  );
}

useGLTF.preload(DICE_URL);
useGLTF.preload(CROWN_URL);
