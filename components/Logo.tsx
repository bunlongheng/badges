export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="url(#badgeGrad)" />
      <circle cx="24" cy="24" r="13" fill="#fff" />
      <circle cx="24" cy="24" r="13" stroke="#fff" strokeWidth="2" />
      <circle cx="24" cy="24" r="8" fill="url(#badgeGrad)" />
      <circle cx="21" cy="21" r="2.5" fill="#fff" fillOpacity="0.9" />
      <defs>
        <linearGradient id="badgeGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818cf8" />
          <stop offset="1" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
