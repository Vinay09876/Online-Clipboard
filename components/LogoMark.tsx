/**
 * The site's logo mark: a clipboard with a code line. Inline SVG (no external asset).
 * Same drawing as app/icon.svg and the generated PNG icons.
 */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#4f46e5" />
      <rect x="9" y="7" width="14" height="19" rx="2.5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <rect x="12.5" y="5" width="7" height="4" rx="1.5" fill="#fff" />
      <path d="M12.5 15.5h7M12.5 20h4.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
