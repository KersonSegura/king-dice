'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { createShapeGeometry, computeFaceData } from './DiceMesh';

const D6_PIP_LAYOUTS = {
  1: [{ x: 0, y: 0 }],
  2: [{ x: -0.35, y: 0.35 }, { x: 0.35, y: -0.35 }],
  3: [{ x: -0.35, y: 0.35 }, { x: 0, y: 0 }, { x: 0.35, y: -0.35 }],
  4: [{ x: -0.35, y: 0.35 }, { x: -0.35, y: -0.35 }, { x: 0.35, y: 0.35 }, { x: 0.35, y: -0.35 }],
  5: [{ x: -0.35, y: 0.35 }, { x: -0.35, y: -0.35 }, { x: 0, y: 0 }, { x: 0.35, y: 0.35 }, { x: 0.35, y: -0.35 }],
  6: [{ x: -0.35, y: 0.3 }, { x: -0.35, y: 0 }, { x: -0.35, y: -0.3 }, { x: 0.35, y: 0.3 }, { x: 0.35, y: 0 }, { x: 0.35, y: -0.3 }]
};

export default function DiceLogoMesh() {
  const meshRef = useRef(null);
  const geometry = useMemo(() => createShapeGeometry('cube'), []);
  const faceData = useMemo(() => computeFaceData(geometry, 'cube'), [geometry]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.012;
    }
  });

  return (
    <group position={[0, 0.3, 0]}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial
          color="#f5f5f5"
          roughness={0.25}
          metalness={0.1}
          envMapIntensity={1}
        />
        <Edges color="white" opacity={0.3} />
        {faceData.map((face, faceIdx) => (
          <group
            key={`${face.value}-${face.labelPosition?.join(',')}`}
            position={[face.centroid.x, face.centroid.y, face.centroid.z]}
            quaternion={face.quaternion}
          >
            {(D6_PIP_LAYOUTS[face.value] || []).map((pip, idx) => (
              <mesh key={idx} position={[pip.x, pip.y, 0.0001]}>
                <circleGeometry args={[0.12, 32]} />
                <meshBasicMaterial color="#0f172a" />
              </mesh>
            ))}
          </group>
        ))}
      </mesh>
    </group>
  );
}
