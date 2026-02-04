'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const getModelUrl = (path) =>
  typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
const DICE_PATH = '/Models/dice/dice_scene.gltf';
const CROWN_PATH = '/Models/crown/crownscene.gltf';

const AUTO_ROTATE_SPEED = 0.008;
const DRAG_SENSITIVITY = 0.004;
const Y_ROTATION_MIN = -Infinity;
const Y_ROTATION_MAX = Infinity;

function useGltf(url) {
  const [state, setState] = useState({ scene: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    const base = url.slice(0, url.lastIndexOf('/') + 1);
    loader.setResourcePath(base);
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (gltf) => {
        if (!cancelled) setState({ scene: gltf.scene, error: null, loading: false });
      },
      undefined,
      (err) => {
        if (!cancelled) setState({ scene: null, error: err, loading: false });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

function DiceAndCrownGroup() {
  const groupRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastPointerX = useRef(0);
  const dragRotationX = useRef(0);
  const [autoRotate, setAutoRotate] = useState(true);

  const diceState = useGltf(getModelUrl(DICE_PATH));
  const crownState = useGltf(getModelUrl(CROWN_PATH));
  const diceScene = diceState.scene;
  const crownScene = crownState.scene;

  const modelsReady = !!diceScene && !!crownScene;
  const { diceClone, crownClone, diceScale, crownScale, diceOffset, crownOffset } = useMemo(() => {
    if (!diceScene || !crownScene) {
      return {
        diceClone: null,
        crownClone: null,
        diceScale: 1,
        crownScale: 1,
        diceOffset: [0, 0, 0],
        crownOffset: [0, 0.6, 0],
      };
    }

    const dClone = diceScene.clone(true);
    dClone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    dClone.updateMatrixWorld(true);
    const diceBox = new THREE.Box3().setFromObject(dClone);
    const diceSize = diceBox.getSize(new THREE.Vector3());
    const diceCenter = diceBox.getCenter(new THREE.Vector3());
    const diceMax = Math.max(diceSize.x, diceSize.y, diceSize.z);
    const dScale = diceMax > 0 ? 0.5 / diceMax : 1;
    const diceOffset = [-diceCenter.x * dScale, -diceCenter.y * dScale, -diceCenter.z * dScale];

    const cClone = crownScene.clone(true);
    cClone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    cClone.updateMatrixWorld(true);
    const crownBox = new THREE.Box3().setFromObject(cClone);
    const crownSize = crownBox.getSize(new THREE.Vector3());
    const crownCenter = crownBox.getCenter(new THREE.Vector3());
    const crownMax = Math.max(crownSize.x, crownSize.y, crownSize.z);
    const cScale = crownMax > 0 ? 0.35 / crownMax : 1;
    const crownOffset = [-crownCenter.x * cScale, 0.35 - crownCenter.y * cScale, -crownCenter.z * cScale];

    return {
      diceClone: dClone,
      crownClone: cClone,
      diceScale: dScale,
      crownScale: cScale,
      diceOffset,
      crownOffset,
    };
  }, [diceScene, crownScene]);

  useFrame(() => {
    if (!groupRef.current) return;
    if (autoRotate) groupRef.current.rotation.y += AUTO_ROTATE_SPEED;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, dragRotationX.current, 0.15);
  });

  const getClientX = (e) => {
    const ev = e.nativeEvent ?? e;
    return ev?.clientX ?? ev?.touches?.[0]?.clientX ?? 0;
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    if (e.pointerId != null) e.target.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setAutoRotate(false);
    lastPointerX.current = getClientX(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = getClientX(e);
    const delta = (clientX - lastPointerX.current) * DRAG_SENSITIVITY;
    dragRotationX.current = THREE.MathUtils.clamp(
      dragRotationX.current + delta,
      Y_ROTATION_MIN,
      Y_ROTATION_MAX
    );
    lastPointerX.current = clientX;
  };

  const handlePointerUp = (e) => {
    if (e.pointerId != null) e.target.releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
  };

  const loading = diceState.loading || crownState.loading;
  const error = !diceState.loading && !diceScene ? 'dice' : !crownState.loading && !crownScene ? 'crown' : null;
  if (!modelsReady) {
    return (
      <Html center style={{ color: '#9ca3af', fontSize: 12 }}>
        {loading ? 'Loading…' : error ? `Failed to load ${error}` : 'Loading…'}
      </Html>
    );
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh
        visible={false}
        position={[0, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <sphereGeometry args={[1.3, 16, 16]} />
      </mesh>
      <group position={diceOffset} scale={[diceScale, diceScale, diceScale]}>
        <primitive object={diceClone} />
      </group>
      <group position={crownOffset} scale={[crownScale, crownScale, crownScale]}>
        <primitive object={crownClone} />
      </group>
    </group>
  );
}

export default function LoginDiceViewer() {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.9} />
      <directionalLight intensity={1} position={[2, 3, 2]} />
      <directionalLight intensity={0.4} position={[-1, 2, 1]} />
      <DiceAndCrownGroup />
    </Canvas>
    </div>
  );
}
