'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GOLD_COLOR = '#ffd700';
const GOLD_ROUGHNESS = 0.3;
const GOLD_METALNESS = 0.9;

export default function CrownMesh() {
  const groupRef = useRef(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.012;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.96, 0]}>
      {/* Base band - sits on top of dice */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <torusGeometry args={[0.55, 0.06, 16, 32]} />
        <meshStandardMaterial
          color={GOLD_COLOR}
          roughness={GOLD_ROUGHNESS}
          metalness={GOLD_METALNESS}
          envMapIntensity={1.2}
        />
      </mesh>
      {/* Crown peaks - 5 points */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 0.5;
        const z = Math.sin(angle) * 0.5;
        const isCenter = i === 2;
        const height = isCenter ? 0.35 : 0.25;
        const baseRadius = isCenter ? 0.12 : 0.08;
        return (
          <mesh
            key={i}
            castShadow
            receiveShadow
            position={[x, height * 0.5 + 0.03, z]}
            rotation={[0, -angle, 0]}
          >
            <coneGeometry args={[baseRadius, height, 8]} />
            <meshStandardMaterial
              color={GOLD_COLOR}
              roughness={GOLD_ROUGHNESS}
              metalness={GOLD_METALNESS}
              envMapIntensity={1.2}
            />
          </mesh>
        );
      })}
      {/* Central jewel - small sphere on the front peak */}
      <mesh castShadow position={[0, 0.4, 0.5]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#c41e3a"
          roughness={0.2}
          metalness={0.3}
          envMapIntensity={1.2}
        />
      </mesh>
    </group>
  );
}
