'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import CanvasErrorBoundary from './CanvasErrorBoundary';
import PerformanceWatchdog from './PerformanceWatchdog';
import StaticOrbIcon from './visuals/StaticOrbIcon';
import { useWebglSupported } from '@/lib/useWebglSupport';

const COMPARISONS = [
  {
    tag: 'Manual sharing',
    sub: 'Slack, email, DMs',
    points: [
      'Encrypted before it ever reaches a server, not typed into a chat window',
      "Revoke access instantly, no hunting down every copy in someone's DMs",
      'Every reveal is logged, you know who saw what, and when',
    ],
  },
  {
    tag: 'EnvManager',
    sub: 'envmanager.com',
    points: [
      "One-time, self-destructing share links for secrets that shouldn't live in any vault",
      'Diff two environments and sync only what changed, without exposing values',
      'Open source and self-hostable, inspect the code instead of trusting a black box',
    ],
  },
  {
    tag: 'envalid',
    sub: 'npm schema validator',
    points: [
      "Checks that a variable is the right shape in code, doesn't store, encrypt, or share it",
      "No dashboard, no invites, no access control, it's a dev dependency, not a vault",
      'EnvGuard covers the step before validation: getting the right secret to the right person',
    ],
  },
  {
    tag: 'dotenvx',
    sub: 'dotenvx.com',
    points: [
      'Protects the file that ends up in your repo. EnvGuard removes the need for that file at all',
      "No keypairs to rotate by hand, revoke a teammate's access with one click",
      'Audit logging and access control ship by default, not as a separate early-access product',
    ],
  },
];

const SPIN_MS = 900;
const ROW_Y = [70, 210, 350];

const CAGE_MAT = new THREE.MeshBasicMaterial({ color: '#B6FF3C', toneMapped: false });

function makeCageGlowEnvMap() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#9fe62f');
  grad.addColorStop(0.35, '#2c3a30');
  grad.addColorStop(0.65, '#161b19');
  grad.addColorStop(1, '#3a4a45');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

function SpinningOrbModel({ spinCount }) {
  const { scene } = useGLTF('/models/compare-sphere.glb');
  const group = useRef();
  const ballRef = useRef();
  const speed = useRef(0.35);
  const boostUntil = useRef(0);
  const envMap = useMemo(() => (typeof document !== 'undefined' ? makeCageGlowEnvMap() : null), []);

  const ballMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#555555',
        metalness: 0.55,
        roughness: 0.32,
        envMap,
        envMapIntensity: 1.4,
      }),
    [envMap]
  );

  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return;
      if (obj.name === 'Cage') obj.material = CAGE_MAT;
      else if (obj.name === 'Ball') {
        obj.material = ballMat;
        ballRef.current = obj;
      }
    });
  }, [scene, ballMat]);

  useEffect(() => {
    if (spinCount === 0) return;
    boostUntil.current = performance.now() + SPIN_MS;
  }, [spinCount]);

  useFrame((state, delta) => {
    const boosting = performance.now() < boostUntil.current;
    const targetSpeed = boosting ? 6 : 0.35;
    speed.current += (targetSpeed - speed.current) * Math.min(delta * 5, 1);
    if (group.current) group.current.rotation.y += speed.current * delta;
    if (ballRef.current) ballRef.current.rotation.x += speed.current * delta * 0.6;
  });

  return <primitive ref={group} object={scene} />;
}

useGLTF.preload('/models/compare-sphere.glb');

function SpinningOrb({ spinCount, onClick, className = '' }) {
  const webglOk = useWebglSupported();
  const [degraded, setDegraded] = useState(false);
  const showModel = webglOk && !degraded;

  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(182,255,60,0.2), transparent 70%)',
          filter: 'blur(14px)',
        }}
      />
      <button
        onClick={onClick}
        aria-label="Show next comparison"
        className="group relative h-full w-full outline-none"
      >
        {showModel ? (
          <CanvasErrorBoundary fallback={<StaticOrbIcon className="h-full w-full" />}>
            <Canvas camera={{ position: [0, 0, 5.2], fov: 32 }} dpr={[1, 1.5]} gl={{ alpha: true }}>
              <ambientLight intensity={0.6} />
              <hemisphereLight args={['#4a5c55', '#0b0f0e', 0.5]} />
              <directionalLight position={[3, 4, 3]} intensity={1} />
              <pointLight position={[-2.5, -1.5, 3]} intensity={3} color="#dfe6e3" />
              <PerformanceWatchdog onSlow={() => setDegraded(true)} />
              <Suspense fallback={null}>
                <SpinningOrbModel spinCount={spinCount} />
              </Suspense>
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          <StaticOrbIcon className="h-full w-full" />
        )}
      </button>
    </div>
  );
}

export default function ComparisonSection() {
  const [index, setIndex] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const current = COMPARISONS[index];

  function goTo(next) {
    if (spinning || next === index) return;
    setSpinning(true);
    setSpinCount((c) => c + 1);
    setTimeout(() => {
      setIndex(next);
      setSpinning(false);
    }, SPIN_MS);
  }

  function handleNext() {
    goTo((index + 1) % COMPARISONS.length);
  }

  return (
    <section id="comparison" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-2 inline-block rounded-sm bg-signal px-2 py-1 font-mono text-xs font-medium text-ink">
          Why not just Slack it
        </p>
        <h2 className="mt-4 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
          The <span className="text-signal">DM thread</span> isn&apos;t a secrets manager
        </h2>

        {/* mobile / tablet */}
        <div className="mt-14 flex flex-col items-center gap-6 lg:hidden">
          <SpinningOrb
            spinCount={spinCount}
            onClick={handleNext}
            className="h-56 w-56 sm:h-64 sm:w-64"
          />
          <div className="flex flex-wrap justify-center gap-2">
            {COMPARISONS.map((c, i) => (
              <button
                key={c.tag}
                onClick={() => goTo(i)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors ${
                  i === index ? 'border-signal text-signal' : 'border-line text-mist hover:text-paper'
                }`}
              >
                {c.tag}
              </button>
            ))}
          </div>
          <div className="mt-2 flex w-full max-w-sm flex-col gap-8">
            {current.points.map((point, i) => (
              <div
                key={`${index}-${i}`}
                className="opacity-0 animate-[fadeUp_500ms_ease_forwards]"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <p className="font-mono text-sm text-signal">0{i + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-mist">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* desktop: competitor list | orb | points */}
        <div className="mt-16 hidden lg:grid lg:grid-cols-[200px_360px_1fr] lg:items-center lg:gap-10">
          <div className="flex flex-col gap-1">
            {COMPARISONS.map((c, i) => {
              const isActive = i === index;
              return (
                <button
                  key={c.tag}
                  onClick={() => goTo(i)}
                  className="group flex flex-col items-start gap-0.5 border-l-2 py-3 pl-4 text-left transition-colors"
                  style={{ borderColor: isActive ? '#B6FF3C' : '#3A4A45' }}
                >
                  <span
                    className={`text-lg font-medium transition-colors ${
                      isActive ? 'text-signal' : 'text-paper/70 group-hover:text-paper'
                    }`}
                  >
                    {c.tag}
                  </span>
                  <span className="text-xs text-mist">{c.sub}</span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <SpinningOrb spinCount={spinCount} onClick={handleNext} className="h-[360px] w-[360px]" />
          </div>

          <div className="relative h-[420px]">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 640 420"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M20,210 C120,210 120,90 150,80" fill="none" stroke="#3A4A45" strokeWidth="1" />
              <path d="M20,210 L150,210" fill="none" stroke="#3A4A45" strokeWidth="1" />
              <path d="M20,210 C120,210 120,330 150,340" fill="none" stroke="#3A4A45" strokeWidth="1" />
              {ROW_Y.map((y) => (
                <circle key={y} cx="150" cy={y} r="3.5" fill="#B6FF3C" />
              ))}
            </svg>

            {current.points.map((point, i) => (
              <div
                key={`${index}-${i}`}
                className="absolute max-w-[320px] -translate-y-1/2 opacity-0 animate-[fadeUp_500ms_ease_forwards]"
                style={{ left: '25%', top: `${(ROW_Y[i] / 420) * 100}%`, animationDelay: `${i * 100}ms` }}
              >
                <p className="font-mono text-sm text-signal">0{i + 1}</p>
                <p className="mt-2 text-sm leading-relaxed text-mist">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}