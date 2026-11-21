/**
 * Light inline illustration of the 3-step flow: phone → 6-digit code → laptop.
 * Decorative only (the steps are described in text right below), so hidden from
 * screen readers. Colours follow the light/dark theme via currentColor + Tailwind.
 */
export function HowItWorksIllustration() {
  return (
    <svg
      viewBox="0 0 600 140"
      className="h-auto w-full text-zinc-400 dark:text-zinc-600"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      {/* Phone */}
      <rect x="40" y="20" width="62" height="104" rx="10" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="52" y="38" width="38" height="5" rx="2.5" className="fill-indigo-500" />
      <rect x="52" y="50" width="30" height="5" rx="2.5" fill="currentColor" />
      <rect x="52" y="62" width="34" height="5" rx="2.5" fill="currentColor" />
      <circle cx="71" cy="110" r="4" fill="currentColor" />

      {/* Arrow 1 */}
      <path d="M126 72h70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9" />
      <path d="m190 64 10 8-10 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Code boxes */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={218 + i * 28}
          y="52"
          width="22"
          height="40"
          rx="5"
          fill="none"
          className="stroke-indigo-500"
          strokeWidth="3"
        />
      ))}

      {/* Arrow 2 */}
      <path d="M404 72h70" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 9" />
      <path d="m468 64 10 8-10 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Laptop */}
      <rect x="494" y="34" width="84" height="56" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="506" y="48" width="44" height="5" rx="2.5" className="fill-indigo-500" />
      <rect x="506" y="60" width="56" height="5" rx="2.5" fill="currentColor" />
      <path d="M482 100h108" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
