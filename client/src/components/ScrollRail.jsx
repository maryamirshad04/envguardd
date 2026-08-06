'use client';
import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'features', label: 'Features' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'how-it-works', label: 'Get started' },
];

export default function ScrollRail() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="pointer-events-auto fixed left-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 xl:flex"
    >
      {SECTIONS.map((s, i) => {
        const isActive = active === s.id;
        return (
          <a key={s.id} href={`#${s.id}`} className="group flex items-center gap-2">
            <span
              className={`font-mono text-[11px] tabular-nums transition-colors ${
                isActive ? 'text-signal' : 'text-mist/50 group-hover:text-mist'
              }`}
            >
              0{i + 1}
            </span>
            <span
              className={`h-px transition-all duration-300 ${
                isActive ? 'w-6 bg-signal' : 'w-3 bg-line group-hover:bg-mist'
              }`}
            />
            <span
              className={`max-w-0 overflow-hidden whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-signal transition-all duration-300 ${
                isActive ? 'max-w-[120px] opacity-100' : 'opacity-0'
              }`}
            >
              {s.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}