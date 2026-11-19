/** Shared Tailwind class strings. One accent colour (indigo) on a neutral (zinc) palette. */

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary =
  `${base} bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600`;

export const btnSecondary =
  `${base} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 ` +
  "dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";

export const btnGhost =
  `${base} text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`;

export const card =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";

export const errorBox =
  "flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 " +
  "dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200";
