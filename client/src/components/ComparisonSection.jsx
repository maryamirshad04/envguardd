'use client';
import { useState } from 'react';

const COMPARISONS = [
  {
    tag: 'Manual sharing',
    sub: 'Slack, email, DMs',
    points: [
      'Encrypted before it ever reaches a server — not typed into a chat window',
      "Revoke access instantly, no hunting down every copy in someone's DMs",
      'Every reveal is logged — you know who saw what, and when',
    ],
  },
  {
    tag: 'EnvManager',
    sub: 'envmanager.com',
    points: [
      "One-time, self-destructing share links for secrets that shouldn't live in any vault",
      'Diff two environments and sync only what changed, without exposing values',
      'Open source and self-hostable — inspect the code instead of trusting a black box',
    ],
  },
  {
    tag: 'envalid',
    sub: 'npm schema validator',
    points: [
      "Checks that a variable is the right shape in code — doesn't store, encrypt, or share it",
      "No dashboard, no invites, no access control — it's a dev dependency, not a vault",
      'EnvGuard covers the step before validation: getting the right secret to the right person',
    ],
  },
  {
    tag: 'dotenvx',
    sub: 'dotenvx.com',
    points: [
      'Protects the file that ends up in your repo — EnvGuard removes the need for that file at all',
      "No keypairs to rotate by hand — revoke a teammate's access with one click",
      'Audit logging and access control ship by default, not as a separate early-access product',
    ],
  },
];

const SPIN_MS = 900;
// evenly spaced, mirrored around the center (210) — used by both the SVG and the point positions
const ROW_Y = [70, 210, 350];

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
    <section className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <p className="mb-2 inline-block rounded-sm bg-signal px-2 py-1 font-mono text-xs font-medium text-ink">
          Why not just Slack it
        </p>
        <h2 className="mt-4 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
          The DM thread isn&apos;t a secrets manager
        </h2>
        <p className="mt-3 max-w-lg text-sm text-mist">
          Click the sphere to spin through how EnvGuard stacks up against manual sharing and the tools people reach for instead.
        </p>

        {/* mobile / tablet: simple stacked layout, no lines, no absolute positioning */}
        <div className="mt-14 flex flex-col items-center gap-10 lg:hidden">
          <Sphere
            current={current}
            spinning={spinning}
            spinCount={spinCount}
            onClick={handleNext}
            className="h-56 w-56 sm:h-64 sm:w-64"
          />
          <div className="flex w-full max-w-sm flex-col gap-8">
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

        {/* desktop: lines + evenly spaced points + sphere on the right, all sharing one coordinate space */}
        <div className="relative mt-16 hidden lg:block lg:h-[420px]">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1000 420"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d={`M280,${ROW_Y[0]} C480,${ROW_Y[0]} 580,${ROW_Y[1] - 30} 660,${ROW_Y[1] - 15}`}
              fill="none"
              stroke="#3A4A45"
              strokeWidth="1"
            />
            <path d={`M280,${ROW_Y[1]} L660,${ROW_Y[1]}`} fill="none" stroke="#3A4A45" strokeWidth="1" />
            <path
              d={`M280,${ROW_Y[2]} C480,${ROW_Y[2]} 580,${ROW_Y[1] + 30} 660,${ROW_Y[1] + 15}`}
              fill="none"
              stroke="#3A4A45"
              strokeWidth="1"
            />
            {ROW_Y.map((y) => (
              <circle key={y} cx="280" cy={y} r="3.5" fill="#B6FF3C" />
            ))}
          </svg>

          {current.points.map((point, i) => (
            <div
              key={`${index}-${i}`}
              className="absolute max-w-[280px] -translate-y-1/2 opacity-0 animate-[fadeUp_500ms_ease_forwards]"
              style={{ top: `${(ROW_Y[i] / 420) * 100}%`, animationDelay: `${i * 100}ms` }}
            >
              <p className="font-mono text-sm text-signal">0{i + 1}</p>
              <p className="mt-2 text-sm leading-relaxed text-mist">{point}</p>
            </div>
          ))}

          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <Sphere
              current={current}
              spinning={spinning}
              spinCount={spinCount}
              onClick={handleNext}
              className="h-[300px] w-[300px]"
            />
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-2 lg:justify-start">
          {COMPARISONS.map((c, i) => (
            <button
              key={c.tag}
              onClick={() => goTo(i)}
              aria-label={`Show comparison vs ${c.tag}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-6 bg-signal' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Sphere({ current, spinning, spinCount, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-label="Show next comparison"
      className={`group relative rounded-full outline-none ${className}`}
    >
      <div
        key={spinning ? `boost-${spinCount}` : 'idle'}
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          animation: spinning
            ? 'ballSpinFast 900ms cubic-bezier(0.33, 1, 0.68, 1) 1'
            : 'ballSpinIdle 10s linear infinite',
        }}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/2"
          style={{ background: 'linear-gradient(90deg, #16250f 0%, #33531f 100%)' }}
        />
        <div
          className="absolute inset-y-0 right-0 w-1/2"
          style={{
            background:
              'radial-gradient(circle at 0% 50%, rgba(182,255,60,0.85) 0%, rgba(182,255,60,0.4) 55%, rgba(182,255,60,0.15) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.35), transparent 30%), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-signal/25 transition-colors group-hover:ring-signal/60" />

      <span
        className={`relative z-10 flex h-full flex-col items-center justify-center px-6 text-center transition-opacity duration-200 sm:px-8 lg:items-end lg:px-10 lg:text-right ${
          spinning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-mist">vs</span>
        <span className="mt-1 text-base font-medium text-paper sm:text-lg">{current.tag}</span>
        <span className="mt-1 text-xs text-mist">{current.sub}</span>
        <span className="mt-3 font-mono text-[10px] uppercase tracking-widest text-signal sm:mt-4">
          click to spin
        </span>
      </span>
    </button>
  );
}