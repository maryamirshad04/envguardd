'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import PerformanceWatchdog from './PerformanceWatchdog';
import StaticLockIcon from './visuals/StaticLockIcon';
import { useWebglSupported } from '@/lib/useWebglSupport';

const DARK_MAT = new THREE.MeshStandardMaterial({ color: '#1c2622', metalness: 0.4, roughness: 0.4 });
const CORE_MAT = new THREE.MeshStandardMaterial({
  color: '#B6FF3C', emissive: '#B6FF3C', emissiveIntensity: 0.5, metalness: 0.15, roughness: 0.28,
});
const KEY_MAT = new THREE.MeshStandardMaterial({ color: '#c3cec9', metalness: 0.65, roughness: 0.22 });

function FloatingKeyLock() {
  const { scene } = useGLTF('/models/keylock.glb');
  const group = useRef();
  const parts = useRef({});

  useEffect(() => {
    const found = {};
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.name === 'Lock_Core') obj.material = CORE_MAT;
      else if (obj.name === 'Key') obj.material = KEY_MAT;
      else obj.material = DARK_MAT;
      found[obj.name] = obj;
    });
    parts.current = found;
  }, [scene]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.25;
      group.current.position.y = Math.sin(t * 0.8) * 0.08;
    }
    if (parts.current.Key) {
      parts.current.Key.rotation.z = Math.sin(t * 0.6) * 0.12;
    }
  });

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload('/models/keylock.glb');

export default function AuthVisual({ heading, subheading }) {
  const webglOk = useWebglSupported();
  const [degraded, setDegraded] = useState(false);
  const showModel = webglOk && !degraded;

  return (
    <div className="relative hidden h-full overflow-hidden bg-surface lg:flex lg:flex-col lg:justify-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at 30% 50%, rgba(182,255,60,0.14), transparent 60%)' }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(231,236,234,0.05) 0px, rgba(231,236,234,0.05) 1px, transparent 1px, transparent 18px)',
          maskImage: 'linear-gradient(90deg, transparent, black 70%)',
          WebkitMaskImage: 'linear-gradient(90deg, transparent, black 70%)',
        }}
      />

      <div className="relative z-10 px-12 xl:px-16">
        <h2 className="mt-10 max-w-sm text-2xl font-semibold leading-tight text-paper xl:text-3xl">
          {heading}
        </h2>
        {subheading && <p className="mt-3 max-w-sm text-base text-mist">{subheading}</p>}
      </div>

      <div className="relative z-10 mt-4 h-[460px] w-full xl:h-[500px]">
        {showModel ? (
          <CanvasErrorBoundary fallback={<StaticLockIcon className="h-full w-full" />}>
            <Canvas camera={{ position: [3.1, 1.9, 5.6], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true }}>
              <ambientLight intensity={0.5} />
              <hemisphereLight args={['#4a5c55', '#0b0f0e', 0.5]} />
              <directionalLight position={[4, 5, 3]} intensity={1.1} />
              <pointLight position={[-3, -1, 2]} intensity={18} color="#B6FF3C" distance={9} decay={2} />
              <pointLight position={[3, 2.5, -2]} intensity={6} color="#B6FF3C" distance={9} decay={2} />
              <PerformanceWatchdog onSlow={() => setDegraded(true)} />
              <Suspense fallback={null}>
                <FloatingKeyLock />
              </Suspense>
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          <StaticLockIcon className="h-full w-full" />
        )}
      </div>
    </div>
  );
}