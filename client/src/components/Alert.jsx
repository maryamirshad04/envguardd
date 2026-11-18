'use client';

const VARIANTS = {
  success: { badge: 'bg-signal text-ink', border: 'border-signal/30', bg: 'bg-signal/10', glyph: '\u2713' },
  error: { badge: 'bg-alert text-ink', border: 'border-alert/30', bg: 'bg-alert/10', glyph: '!' },
  warning: { badge: 'bg-amber-400 text-ink', border: 'border-amber-400/30', bg: 'bg-amber-400/10', glyph: '!' },
  info: { badge: 'bg-sky-400 text-ink', border: 'border-sky-400/30', bg: 'bg-sky-400/10', glyph: 'i' },
};

export default function Alert({ variant = 'error', title, children, onClose, className = '' }) {
  const v = VARIANTS[variant] || VARIANTS.error;

  return (
    <div className={`flex items-start gap-3 rounded-sm border ${v.border} ${v.bg} px-3 py-2.5 ${className}`}>
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${v.badge}`}
        aria-hidden="true"
      >
        {v.glyph}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <>
            <p className="text-sm font-medium text-paper">{title}</p>
            {children && <p className="mt-0.5 text-sm text-mist">{children}</p>}
          </>
        ) : (
          <p className="text-sm text-paper">{children}</p>
        )}
      </div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="shrink-0 text-mist hover:text-paper">
          &#10005;
        </button>
      )}
    </div>
  );
}
