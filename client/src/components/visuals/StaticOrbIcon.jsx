export default function StaticOrbIcon({ className = '' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(182,255,60,0.2), transparent 70%)',
          filter: 'blur(14px)',
        }}
      />
      <svg viewBox="0 0 200 200" className="relative h-40 w-40 animate-[spin_16s_linear_infinite]">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#B6FF3C" strokeWidth="2" opacity="0.8" />
        <ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="#B6FF3C" strokeWidth="1.5" opacity="0.5" />
        <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke="#B6FF3C" strokeWidth="1.5" opacity="0.5" />
      </svg>
      <div
        className="absolute h-16 w-16 rounded-full"
        style={{ background: 'radial-gradient(circle at 35% 35%, #8a938f, #2a322e)' }}
      />
    </div>
  );
}