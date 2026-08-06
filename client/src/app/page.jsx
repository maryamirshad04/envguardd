import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FlowDiagram from '@/components/FlowDiagram';
import ArchitectureFlow from '@/components/ArchitectureFlow';
import ComparisonSection from '@/components/ComparisonSection';
import TrustMetrics from '@/components/TrustMetrics';
import ScrollRail from '@/components/ScrollRail';

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
    body: "Admins revoke a collaborator's access instantly — no rotating every key in the project by hand.",
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

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <ScrollRail />

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
              <a href="#how-it-works" className="text-sm text-mist hover:text-paper">
                See how it works &rarr;
              </a>
            </div>
          </div>
          <FlowDiagram />
        </div>
      </section>

      <section id="metrics">
        <TrustMetrics />
      </section>

      <section id="features" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="mb-2 inline-block rounded-sm bg-signal px-2 py-1 font-mono text-xs font-medium text-ink">
            Features
          </p>
          <h2 className="mt-4 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
            Everything a team needs to stop treating .env like a chat attachment
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

      <ArchitectureFlow />

      <div id="comparison">
        <ComparisonSection />
      </div>

      <section id="how-it-works" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold text-paper sm:text-3xl">
            Your secrets, encrypted before they ever leave your browser.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-mist">
            Set up your first project in a few minutes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-sm bg-signal px-6 py-3 text-sm font-medium text-ink hover:bg-signal/90"
          >
            Get started free
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}