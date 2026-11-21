"use client";

import { useSyncExternalStore } from "react";

/**
 * Light / dark switch. Light is the default (whatever the device setting); one click turns
 * dark on, another turns it off. "dark" is stored in localStorage on this device only (never
 * sent to the server) and applied before the first paint by the inline script in
 * app/layout.tsx.
 */
const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => document.documentElement.getAttribute("data-theme") === "dark";
const getServerSnapshot = () => false;

function setDark(dark: boolean) {
  const root = document.documentElement;
  if (dark) root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  try {
    if (dark) localStorage.setItem(STORAGE_KEY, "dark");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, blocked): the choice still applies to this page.
  }
  listeners.forEach((l) => l());
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label="Dark theme"
      aria-pressed={dark}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {/* Shows what a click will switch to: a moon in light mode, a sun in dark mode. */}
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

const iconProps = {
  className: "size-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
