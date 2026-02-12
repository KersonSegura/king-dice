/**
 * Native 3D dice using expo-gl + three.js.
 * Loads KingDice.glb from mobile-app/assets/Models/KingDice.glb
 */
import '../polyfills';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as THREE from 'three';
import { LoaderUtils } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Required for some Three.js loaders under Metro (see expo-three docs)
if (typeof global !== 'undefined') (global as any).THREE = THREE;

// Patch LoaderUtils.extractUrlBase - Three.js calls it with undefined in RN when resolving GLB resources
const _extractUrlBase = LoaderUtils.extractUrlBase.bind(LoaderUtils);
LoaderUtils.extractUrlBase = (url: string) => {
  if (url == null || typeof url !== 'string') return './';
  return _extractUrlBase(url);
};

const AUTO_ROTATE_SPEED = 0.01;
const ROTATION_LERP = 0.24;
const IDLE_BEFORE_AUTO_ROTATE_MS = 2000;

const KING_DICE_GLB_ASSET = require('../assets/Models/KingDice.glb');

/** Load GLB from bundled asset. Try fetch (dev), then legacy Base64, then new File API. */
async function loadBundledKingDiceGlb(): Promise<ArrayBuffer> {
  const glbAsset = Asset.fromModule(KING_DICE_GLB_ASSET);
  await glbAsset.downloadAsync();
  const glbUri = glbAsset.localUri || glbAsset.uri;
  if (!glbUri) throw new Error('KingDice.glb not available');

  if (glbUri.startsWith('http://') || glbUri.startsWith('https://')) {
    const res = await fetch(glbUri);
    if (!res.ok) throw new Error(`Fetch GLB failed: ${res.status}`);
    return res.arrayBuffer();
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(glbUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const atobFn = typeof atob !== 'undefined' ? atob : (global as any).atob;
    if (!atobFn) throw new Error('atob not available');
    const binary = atobFn(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch (legacyErr: any) {
    if (glbUri.startsWith('file://')) {
      const file = new File(glbUri);
      return file.arrayBuffer();
    }
    throw legacyErr;
  }
}

export type NativeDiceViewerRef = { addRotation: (delta: number) => void };

const NativeDiceViewer = forwardRef<NativeDiceViewerRef>((_, ref) => {
  const [error, setError] = useState<string | null>(null);
  const rotationY = useRef(0);
  const targetRotationY = useRef(0);
  const lastUserInteractionTime = useRef(0);

  useImperativeHandle(ref, () => ({
    addRotation: (delta: number) => {
      lastUserInteractionTime.current = Date.now();
      targetRotationY.current += delta;
    },
  }), []);

  const onContextCreate = async (gl: any) => {
    try {
      // Patch: React Native/expo-gl can return null/undefined from getShaderInfoLog/getProgramInfoLog
      // Three.js calls .trim() on these and crashes. Ensure they always return a string.
      const origGetShaderInfoLog = gl.getShaderInfoLog?.bind(gl);
      if (origGetShaderInfoLog) {
        gl.getShaderInfoLog = (shader: WebGLShader) => origGetShaderInfoLog(shader) ?? '';
      }
      const origGetProgramInfoLog = gl.getProgramInfoLog?.bind(gl);
      if (origGetProgramInfoLog) {
        gl.getProgramInfoLog = (program: WebGLProgram) => origGetProgramInfoLog(program) ?? '';
      }

      let width = gl.drawingBufferWidth || 300;
      let height = gl.drawingBufferHeight || 200;
      if (width < 1 || height < 1) {
        width = 300;
        height = 200;
      }
      const aspect = width / height;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
      camera.position.set(0, 0, 2.5);

      const renderer = new THREE.WebGLRenderer({ context: gl, antialias: true });
      renderer.setSize(width, height);
      renderer.setClearColor(0xffffff, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1;

      scene.add(new THREE.AmbientLight(0xffffff, 1.2));
      scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.6));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1);
      keyLight.position.set(3, 5, 4);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
      fillLight.position.set(-2, 3, 2);
      scene.add(fillLight);

      const group = new THREE.Group();
      group.position.set(0, 0, 0);
      scene.add(group);

      const glbBuffer = await loadBundledKingDiceGlb();
      const loader = new GLTFLoader();
      const diceScene = await new Promise<THREE.Object3D>((resolve, reject) => {
        loader.parse(glbBuffer, '', (gltf) => resolve(gltf.scene), reject);
      });

      diceScene.traverse((node: any) => {
        if (node.isMesh && node.material) {
          const mat = node.material;
          if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          if (mat.aoMap) mat.aoMap.colorSpace = THREE.SRGBColorSpace;
        }
      });

      const diceBox = new THREE.Box3().setFromObject(diceScene);
      const diceSize = diceBox.getSize(new THREE.Vector3());
      const diceCenter = diceBox.getCenter(new THREE.Vector3());
      const dScale = Math.max(diceSize.x, diceSize.y, diceSize.z) > 0 ? 1.2 / Math.max(diceSize.x, diceSize.y, diceSize.z) : 1;

      diceScene.position.set(-diceCenter.x * dScale, -diceCenter.y * dScale, -diceCenter.z * dScale);
      diceScene.scale.setScalar(dScale);

      group.add(diceScene);

      const render = () => {
        requestAnimationFrame(render);
        const w = gl.drawingBufferWidth || width;
        const h = gl.drawingBufferHeight || height;
        if (w > 0 && h > 0) {
          if (w !== width || h !== height) {
            width = w;
            height = h;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
          }
          const now = Date.now();
          if (now - lastUserInteractionTime.current > IDLE_BEFORE_AUTO_ROTATE_MS) {
            targetRotationY.current += AUTO_ROTATE_SPEED;
          }
          rotationY.current += (targetRotationY.current - rotationY.current) * ROTATION_LERP;
          group.rotation.y = rotationY.current;
          renderer.render(scene, camera);
        }
        gl.endFrameEXP();
      };
      render();
    } catch (err: any) {
      const msg = err?.message || 'Failed to load 3D models';
      const stack = err?.stack ? `\n${String(err.stack).split('\n').slice(0, 5).join('\n')}` : '';
      setError(msg + stack);
    }
  };

  if (error) {
    return (
      <View style={[styles.container, styles.placeholder]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} collapsable={false} pointerEvents="none">
      <GLView style={styles.gl} onContextCreate={onContextCreate} pointerEvents="none" />
    </View>
  );
});

NativeDiceViewer.displayName = 'NativeDiceViewer';

export default NativeDiceViewer;

const DICE_VIEW_HEIGHT = 200;

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: DICE_VIEW_HEIGHT, minHeight: DICE_VIEW_HEIGHT, backgroundColor: '#ffffff' },
  gl: { width: '100%', height: DICE_VIEW_HEIGHT },
  loadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { fontSize: 12, color: '#9ca3af' },
  placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  errorText: { fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },
});
