'use client';
import { useState } from 'react';
import Link from 'next/link';

const SECTIONS = [
  { href: '#features', label: 'Features' },
  { href: '#metrics', label: 'Metrics' },
  { href: '#architecture', label: 'Architecture' },
  { href: '#comparison', label: 'Comparison' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative border-b border-line">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-mono text-lg tracking-tight text-paper">
          <img src="/lock.svg" alt="Envguard icon" className="inline-block h-5 w-5 text-signal align-middle" />
          <span className="align-middle">envguard</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-mist md:flex">
          {SECTIONS.map((s) => (
            <a key={s.href} href={s.href} className="hover:text-paper">
              {s.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="text-sm text-mist hover:text-paper">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
          >
            Get started
          </Link>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className="h-px w-5 bg-paper transition-transform"
            style={{ transform: open ? 'translateY(3.5px) rotate(45deg)' : 'none' }}
          />
          <span
            className="h-px w-5 bg-paper transition-transform"
            style={{ transform: open ? 'translateY(-3.5px) rotate(-45deg)' : 'none' }}
          />
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-ink px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-sm text-mist">
            {SECTIONS.map((s) => (
              <a key={s.href} href={s.href} onClick={() => setOpen(false)} className="hover:text-paper">
                {s.label}
              </a>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4 border-t border-line pt-4">
            <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-mist hover:text-paper">
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-sm bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal/90"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}