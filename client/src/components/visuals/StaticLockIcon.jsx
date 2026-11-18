export default function StaticLockIcon({ open = false, className = '' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 55%, rgba(182,255,60,0.28), rgba(182,255,60,0.08) 45%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />
      <svg viewBox="0 0 200 200" className="relative h-40 w-40">
        <path
          d="M70,90 V65 a30,30 0 0 1 60,0 v25"
          fill="none"
          stroke="#3A4A45"
          strokeWidth="7"
          strokeLinecap="round"
          style={{
            transform: open ? 'translateY(-14px) rotate(-10deg)' : 'none',
            transformOrigin: '100px 78px',
            transition: 'transform 500ms ease',
          }}
        />
        <rect x="55" y="88" width="90" height="70" rx="10" fill="#161f1b" stroke="#3A4A45" strokeWidth="2" />
        <circle cx="100" cy="118" r="9" fill="#B6FF3C" />
        <rect x="96" y="122" width="8" height="20" rx="3" fill="#B6FF3C" />
      </svg>
    </div>
  );
}