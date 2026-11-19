import { formatBytes } from "@/lib/apiClient";

/** Upload progress. `total` 0 means "unknown yet". */
export function ProgressBar({ loaded, total, label }: { loaded: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm text-zinc-700 dark:text-zinc-300">
        <span id="upload-progress-label">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="upload-progress-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={total > 0 ? `${pct}%, ${formatBytes(loaded)} of ${formatBytes(total)}` : `${pct}%`}
        className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
        {total > 0 ? `${formatBytes(loaded)} of ${formatBytes(total)}` : " "}
      </p>
    </div>
  );
}
