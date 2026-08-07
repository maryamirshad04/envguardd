import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FlowDiagram from '@/components/FlowDiagram';
import ArchitectureFlow from '@/components/ArchitectureFlow';
import ComparisonSection from '@/components/ComparisonSection';
import TrustMetrics from '@/components/TrustMetrics';

const FEATURES = [
  {
    label: 'Encrypted storage',
    title: 'Secrets encrypted before they leave the browser',
    body: 'Environment variables are encrypted client-side with the Web Crypto API. The server only ever sees ciphertext.',
  },
  {
    label: 'No more copy-paste',
    title: 'Eliminate manual .env sharing',
    body: 'Stop dropping secrets into Slack, WhatsApp, or email threads where they sit exposed indefinitely.',
  },
  {
    label: 'Access control',
    title: 'Authenticate before any secret is granted',
    body: 'JWT-based sessions plus OAuth (Google/GitHub) confirm identity before a single variable is decrypted.',
  },
  {
    label: 'Instant revocation',
    title: 'Cut off access the moment someone leaves',
    body: "Admins revoke a collaborator's access instantly, no rotating every key in the project by hand.",
  },
  {
    label: 'Temporary sessions',
    title: 'Time-boxed access windows',
    body: "Configure session expiration so access to sensitive projects doesn't linger longer than it should.",
  },
  {
    label: 'Read-once policy',
    title: 'One-time reveal for the most sensitive keys',
    body: "Mark a secret as read-once so it's guaranteed to be seen by exactly one person, exactly one time.",
  },
];

const GET_STARTED_POINTS = [
  {
    title: 'Encrypted client-side before it ever reaches our servers',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Role-based access, revoked instantly when someone leaves',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2l7 3v6c0 5-3.4 8.4-7 10-3.6-1.6-7-5-7-10V5l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'A CLI and web dashboard with full feature parity',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 9l4 3-4 3M13 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <>
      <Navbar />

      <section id="hero" className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-widest text-signal">
              Zero-knowledge secret sharing
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-paper sm:text-5xl">
              Stop pasting <span className="text-signal">.env</span> files into Slack.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-mist">
              EnvGuard replaces manual secret distribution with authenticated,
              centralized access control so your team collaborates without
              ever exposing plaintext secrets.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-sm bg-signal px-6 py-3 text-sm font-medium text-ink hover:bg-signal/90"
              >
                Create free account
              </Link>
              <a href="#architecture" className="text-sm text-mist hover:text-paper">
                See how it works &rarr;
              </a>
            </div>
          </div>
          <FlowDiagram />
        </div>
      </section>

      <section id="features" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-2 inline-block rounded-sm bg-signal px-2 py-1 font-mono text-xs font-medium text-ink">
            Features
          </p>
          <h2 className="mt-4 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
            Everything a team needs to stop treating <span className="text-signal">.env</span> like a chat attachment
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-sm border border-line bg-surface p-6 transition-colors hover:border-signal/40"
              >
                <p className="font-mono text-xs uppercase tracking-wider text-signal">
                  {f.label}
                </p>
                <h3 className="mt-3 text-lg font-medium text-paper">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrustMetrics />

      <ArchitectureFlow />

      <ComparisonSection />

      <section id="get-started" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
            {/* stripe texture, visible across the full card */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(90deg, rgba(231,236,234,0.06) 0px, rgba(231,236,234,0.06) 1px, transparent 1px, transparent 16px)',
                maskImage: 'linear-gradient(90deg, transparent 30%, black 90%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 30%, black 90%)',
              }}
            />
            {/* soft glow, not a full wash — stops well short of opaque */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(182,255,60,0.05) 55%, rgba(182,255,60,0.16) 100%)',
              }}
            />

            <div className="relative flex flex-col gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="lg:max-w-md">
                <h2 className="text-2xl font-semibold text-paper sm:text-3xl">
                  Your secrets, <span className="text-signal">encrypted</span> before they ever leave your browser.
                </h2>
                <p className="mt-3 text-sm text-mist">
                  Set up your first project in a few minutes, no plaintext ever touches our servers.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-block rounded-sm bg-signal px-6 py-3 text-sm font-medium text-ink hover:bg-signal/90"
                >
                  Get started free
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:max-w-lg lg:shrink-0">
                {GET_STARTED_POINTS.map((pt) => (
                  <div
                    key={pt.title}
                    className="flex items-start gap-3 rounded-lg border border-line/60 bg-ink/40 p-4 backdrop-blur-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal text-ink">
                      {pt.icon}
                    </span>
                    <p className="text-xs leading-relaxed text-mist">{pt.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}