'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const STATS = [
  { value: 'AES-256-GCM', label: 'Encryption before storage, the server only ever sees ciphertext' },
  { value: '1-time', label: 'Share links expire after a single reveal' },
  { value: 'Immutable', label: "Audit log entries can't be edited or deleted, even by admins" },
  { value: 'CLI + Web', label: 'Full feature parity manage secrets from your terminal or the dashboard' },
];

const DARK_MAT = new THREE.MeshStandardMaterial({ color: '#1c2622', metalness: 0.4, roughness: 0.4 });
const CORE_MAT = new THREE.MeshStandardMaterial({
  color: '#B6FF3C', emissive: '#B6FF3C', emissiveIntensity: 0.55, metalness: 0.15, roughness: 0.28,
});
const KEY_MAT = new THREE.MeshStandardMaterial({ color: '#c3cec9', metalness: 0.65, roughness: 0.22 });

// how far pieces travel when unlocked — kept modest so they stay inside the camera frustum
const TOP_OFFSET = 0.7;
const BOTTOM_OFFSET = 0.7;
const KEY_OFFSET = 0.45;

function KeyLockModel({ open }) {
  const { scene } = useGLTF('/models/keylock.glb');
  const parts = useRef({});
  const ready = useRef(false);
  const progress = useRef(0);

  useEffect(() => {
    const found = { Lock_Top: null, Lock_Bottom: null, Lock_Core: null, Key: null };
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.name === 'Lock_Core') obj.material = CORE_MAT;
      else if (obj.name === 'Key') obj.material = KEY_MAT;
      else obj.material = DARK_MAT;

      if (found.hasOwnProperty(obj.name)) {
        found[obj.name] = obj;
        obj.userData.baseY = obj.position.y;
        obj.userData.baseX = obj.position.x;
      }
    });

    const missing = Object.entries(found).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      console.warn('[TrustMetrics] Could not find expected mesh names in keylock.glb:', missing);
    }

    parts.current = found;
    ready.current = true;
  }, [scene]);

  useFrame((_, delta) => {
    if (!ready.current) return;
    const targetVal = open ? 1 : 0;
    progress.current += (targetVal - progress.current) * Math.min(delta * 4, 1);
    const p = progress.current;
    const { Lock_Top, Lock_Bottom, Lock_Core, Key } = parts.current;

    if (Lock_Top) Lock_Top.position.y = Lock_Top.userData.baseY + p * TOP_OFFSET;
    if (Lock_Bottom) Lock_Bottom.position.y = Lock_Bottom.userData.baseY - p * BOTTOM_OFFSET;
    if (Key) {
      Key.position.x = Key.userData.baseX - p * KEY_OFFSET;
      Key.rotation.z = p * 0.5;
    }
    if (Lock_Core) {
      Lock_Core.material.emissiveIntensity = 0.3 + p * 0.55;
    }
  });

  return <primitive object={scene} />;
}

useGLTF.preload('/models/keylock.glb');

function LockScene({ open }) {
  return (
    <Canvas camera={{ position: [3.6, 2.1, 6.4], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true }}>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#4a5c55', '#0b0f0e', 0.5]} />
      <directionalLight position={[4, 5, 3]} intensity={1.1} />
      <directionalLight position={[-4, 2, -3]} intensity={0.4} />
      <pointLight position={[-3, -1, 2]} intensity={22} color="#B6FF3C" distance={8} decay={2} />
      <pointLight position={[3, 2.5, -2]} intensity={8} color="#B6FF3C" distance={8} decay={2} />
      <spotLight
        position={[-1.5, 4, 2.5]}
        target-position={[0, 0, 0]}
        angle={0.5}
        penumbra={0.6}
        intensity={26}
        color="#B6FF3C"
        distance={9}
        decay={2}
      />
      <Suspense fallback={null}>
        <KeyLockModel open={open} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.5}
        target={[0, -0.1, 0]}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}

export default function TrustMetrics() {
  const [open, setOpen] = useState(false);
  const sectionRef = useRef(null);
  const autoTriggered = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !autoTriggered.current) {
          autoTriggered.current = true;
          setOpen(true);
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="metrics" ref={sectionRef} className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-2 inline-block rounded-sm bg-signal px-2 py-1 font-mono text-xs font-medium text-ink">
          Metrics
        </p>
        <h2 className="mt-4 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
          What&apos;s actually <span className="text-signal">guaranteed</span>, not just claimed
        </h2>
        <div className="mt-4 hidden lg:grid lg:grid-cols-[1fr_420px] lg:items-center lg:gap-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            {STATS.map((s, i) => (
              <div
                key={s.value}
                className="transition-all duration-500"
                style={{
                  opacity: open ? 1 : 0.35,
                  transform: open ? 'translateY(0)' : 'translateY(6px)',
                  transitionDelay: open ? `${i * 80}ms` : '0ms',
                }}
              >
                <p className="font-mono text-xs text-signal">0{i + 1}</p>
                <p className="mt-1 text-2xl font-medium text-paper">{s.value}</p>
                <p className="mt-1 text-sm leading-relaxed text-mist">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <div className="relative h-[340px] w-full">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(circle at 50% 55%, rgba(182,255,60,0.28), rgba(182,255,60,0.08) 45%, transparent 70%)',
                  filter: 'blur(18px)',
                }}
              />
              <div className="relative h-full w-full">
                <LockScene open={open} />
              </div>
            </div>

            <button
              onClick={() => setOpen((o) => !o)}
              className="mt-4 rounded-sm border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:border-signal/50 hover:text-signal"
            >
              {open ? 'Lock it back up' : 'Click to unlock'}
            </button>
          </div>
        </div>

        {/* mobile: model on top, stats stacked below */}
        <div className="mt-14 lg:hidden">
          <div className="relative mx-auto h-[280px] w-full max-w-sm">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'radial-gradient(circle at 50% 55%, rgba(182,255,60,0.28), rgba(182,255,60,0.08) 45%, transparent 70%)',
                filter: 'blur(16px)',
              }}
            />
            <div className="relative h-full w-full">
              <LockScene open={open} />
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-sm border border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-mist transition-colors hover:border-signal/50 hover:text-signal"
            >
              {open ? 'Lock it back up' : 'Click to unlock'}
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {STATS.map((s, i) => (
              <div
                key={s.value}
                className="transition-all duration-500"
                style={{
                  opacity: open ? 1 : 0.5,
                  transitionDelay: open ? `${i * 80}ms` : '0ms',
                }}
              >
                <p className="font-mono text-xs text-signal">0{i + 1}</p>
                <p className="mt-1 text-xl font-medium text-paper">{s.value}</p>
                <p className="mt-1 text-sm leading-relaxed text-mist">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}