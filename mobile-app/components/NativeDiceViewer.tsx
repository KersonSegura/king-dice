/**
 * Native 3D dice using expo-gl + three.js.
 * Loads KingDice.glb from bundled assets.
 */
import '../app/polyfills';

import React, { useState, useRef } from 'react';
import { View, StyleSheet, Text, PanResponder, Platform } from 'react-native';
import { GLView } from 'expo-gl';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
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

const AUTO_ROTATE_SPEED = 0.008;
const DRAG_SENSITIVITY = 0.005;
const ROTATION_LERP = 0.12;

const KING_DICE_GLB_ASSET = require('../assets/Models/KingDice.glb');

/** Load GLB from bundled asset - no network, uses FileSystem + parse only */
async function loadBundledKingDiceGlb(): Promise<ArrayBuffer> {
  const glbAsset = Asset.fromModule(KING_DICE_GLB_ASSET);
  await glbAsset.downloadAsync();
  const glbUri = glbAsset.localUri || glbAsset.uri;
  if (!glbUri) throw new Error('KingDice.glb not available');
  const base64 = await FileSystem.readAsStringAsync(glbUri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export default function NativeDiceViewer() {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const rotationY = useRef(0);
  const targetRotationY = useRef(0);
  const isDragging = useRef(false);

  const lastX = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        isDragging.current = true;
        lastX.current = g.pageX;
      },
      onPanResponderMove: (_, g) => {
        const delta = (g.pageX - lastX.current) * DRAG_SENSITIVITY;
        targetRotationY.current += delta;
        lastX.current = g.pageX;
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
      },
    })
  ).current;

  const onContextCreate = async (gl: any) => {
    try {
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

      setReady(true);
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
          if (!isDragging.current) {
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
    <View style={styles.container} collapsable={false} {...panResponder.panHandlers}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} pointerEvents="none" />
      {!ready && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <Text style={styles.loadingText}>Loading…</Text>
          {Platform.OS === 'android' && (
            <Text style={[styles.loadingText, { marginTop: 8, fontSize: 10 }]}>
              If blank, try a physical device
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const DICE_VIEW_HEIGHT = 200;

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', height: DICE_VIEW_HEIGHT, minHeight: DICE_VIEW_HEIGHT, backgroundColor: '#f5f5f5' },
  gl: { width: '100%', height: DICE_VIEW_HEIGHT },
  loadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { fontSize: 12, color: '#9ca3af' },
  placeholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  errorText: { fontSize: 12, color: '#6b7280' },
});
