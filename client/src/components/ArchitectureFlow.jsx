import Reveal from './Reveal';

const STEPS = [
  { n: '01', title: 'Sign up', body: 'A user signs up and lands in a default Company workspace as admin.' },
  { n: '02', title: 'Encrypt', body: 'Variables are encrypted client-side with AES-256-GCM before they ever reach the server.' },
  { n: '03', title: 'Store', body: 'Supabase (Postgres) stores ciphertext only, organized by project and environment.' },
  { n: '04', title: 'Access', body: 'Role-based permissions (Admin / Member) are enforced server-side on every request.' },
  { n: '05', title: 'Audit', body: 'Reveals, edits, and shares are written to an immutable, admin-only audit log.' },
];

export default function ArchitectureFlow() {
  return (
    <section id="architecture" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <Reveal>
          <p className="mb-2 inline-block rounded-sm bg-signal px-2 py-1 font-mono text-xs font-medium text-ink">
            Architecture
          </p>
          <h2 className="mt-4 max-w-lg text-2xl font-semibold text-paper sm:text-3xl">
            What actually happens when you <span className="text-signal">save</span> a secret
          </h2>
        </Reveal>

        <div className="mt-14 flex flex-col lg:flex-row lg:items-stretch">
          {STEPS.map((step, i) => (
            <Reveal
              key={step.n}
              delay={i * 100}
              className="flex flex-1 flex-col lg:flex-row lg:items-center"
            >
              <div className="flex-1 rounded-sm border border-line bg-surface p-6 transition-colors hover:border-signal/40">
                <p className="font-mono text-xs text-signal">{step.n}</p>
                <h3 className="mt-2 text-base font-medium text-paper">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{step.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex shrink-0 items-center justify-center py-3 lg:px-3 lg:py-0">
                  <svg
                    className="h-5 w-5 rotate-90 text-signal/60 lg:rotate-0"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}