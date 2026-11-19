"use client";

import { useEffect, useRef } from "react";
import { useNow } from "@/lib/useNow";
import { ClockIcon } from "./icons";

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * Live "m:ss" until `until` (client-clock ms). Calls onDone once when it reaches zero.
 * Not announced every second (role="timer" is polite-off by default).
 */
export function Countdown({ until, onDone }: { until: number; onDone?: () => void }) {
  const now = useNow();
  const remaining = now === 0 ? null : until - now;
  const done = remaining !== null && remaining <= 0;

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    if (done) onDoneRef.current?.();
  }, [done]);

  return (
    <span role="timer" className="font-mono tabular-nums">
      {remaining === null ? "–:––" : formatDuration(remaining)}
    </span>
  );
}

/** "Expires in 29:41" line. */
export function ExpiryLine({ until, onExpire }: { until: number; onExpire: () => void }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
      <ClockIcon className="size-4" />
      <span>
        Expires in <Countdown until={until} onDone={onExpire} />
      </span>
    </p>
  );
}

/** 429 message with a live wait countdown (role=status so it is announced once). */
export function RateLimitNotice({ until, onDone }: { until: number; onDone: () => void }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <ClockIcon className="mt-0.5 size-4 shrink-0" />
      <span>
        Too many attempts. You can try again in <Countdown until={until} onDone={onDone} />.
      </span>
    </div>
  );
}
