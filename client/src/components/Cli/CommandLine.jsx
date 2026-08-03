'use client';

import { useState } from 'react';

export default function CommandLine({ children, className = '' }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === 'string' ? children : String(children);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — fail silently
    }
  }

  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-3 rounded-sm border border-line bg-ink px-4 py-2.5 font-mono text-sm text-paper ${className}`}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre">
        <span className="select-none text-signal">$ </span>
        {text}
      </code>
      <button
        onClick={handleCopy}
        aria-label="Copy command"
        className="shrink-0 rounded-sm border border-line px-2 py-1 font-sans text-[10px] uppercase tracking-wide text-mist hover:border-signal/40 hover:text-paper"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}