'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DICE_PATH = '/Models/dice/dice_scene.gltf';

export default function DiceBasicEmbedPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0xffffff, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 2.5);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(2, 3, 2);
    scene.add(ambient, key);

    let model: THREE.Object3D | null = null;
    const loader = new GLTFLoader();
    const url = typeof window !== 'undefined' ? `${window.location.origin}${DICE_PATH}` : DICE_PATH;
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (gltf) => {
        model = gltf.scene;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = false;
            (child as THREE.Mesh).receiveShadow = false;
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 ? 1.2 / maxDim : 1;
        model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        model.scale.setScalar(scale);
        scene.add(model);
        setStatus('ready');
      },
      undefined,
      () => {
        setStatus('error');
      }
    );

    const resize = () => {
      const parent = canvas.parentElement;
      const width = parent?.clientWidth ?? canvas.clientWidth ?? 200;
      const height = parent?.clientHeight ?? canvas.clientHeight ?? 200;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      if (model) model.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        html, body, #__next {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #fff;
        }
      `}</style>
      <div style={{ width: '100%', height: '100%', position: 'relative', background: '#fff' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {status !== 'ready' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: 12,
            }}
          >
            {status === 'loading' ? 'Loading dice…' : 'Failed to load dice'}
          </div>
        )}
      </div>
    </>
  );
}
