"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import {
  errorMessage,
  formatBytes,
  getClip,
  getDownloadUrl,
  toClientTime,
  type ApiError,
  type ClipData,
} from "@/lib/apiClient";
import { CodeInput, emptyDigits, type CodeInputHandle } from "./CodeInput";
import { ExpiryLine, RateLimitNotice } from "./Countdown";
import { CopyButton } from "./CopyButton";
import { AlertIcon, ClockIcon, DownloadIcon, FileIcon, Spinner } from "./icons";
import { btnPrimary, btnSecondary, card, errorBox } from "./ui";

type State =
  | { kind: "idle" }
  | { kind: "loading"; code: string }
  | { kind: "found"; code: string; clip: ClipData; expiresAt: number }
  | { kind: "expired" }
  | { kind: "error"; message: string };

export type ReceivePanelHandle = { open: (code: string) => void };

export function ReceivePanel({ maxFileMb, ref }: { maxFileMb: number; ref?: React.Ref<ReceivePanelHandle> }) {
  const [digits, setDigits] = useState<string[]>(emptyDigits);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const codeInput = useRef<CodeInputHandle>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const expiredHeading = useRef<HTMLHeadingElement>(null);
  const statusId = useId();

  /** Where focus should go after the next render. */
  const pendingFocus = useRef<"input" | "result" | "expired" | null>(null);
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "input") codeInput.current?.focus(0);
    if (target === "result") resultHeading.current?.focus();
    if (target === "expired") expiredHeading.current?.focus();
  });

  function handleError(error: ApiError) {
    if (error.kind === "rate_limited") {
      setBlockedUntil(Date.now() + error.retryAfterSeconds * 1000);
      setState({ kind: "idle" });
    } else {
      setState({ kind: "error", message: errorMessage(error, { maxFileMb }) });
      pendingFocus.current = "input";
    }
    setDigits(emptyDigits());
  }

  async function lookup(code: string) {
    if (blockedUntil || state.kind === "loading") return;
    setState({ kind: "loading", code });
    const res = await getClip(code);
    if (!res.ok) return handleError(res.error);
    setState({ kind: "found", code, clip: res.data, expiresAt: toClientTime(res.data.expiresAt) });
    pendingFocus.current = "result";
  }

  function reset() {
    setDigits(emptyDigits());
    setState({ kind: "idle" });
    pendingFocus.current = "input";
  }

  // Lets the page open a code from a #123456 link.
  useImperativeHandle(ref, () => ({
    open: (code: string) => {
      setDigits(code.split(""));
      void lookup(code);
    },
  }));

  const busy = state.kind === "loading";
  const blocked = blockedUntil !== null;

  if (state.kind === "found") {
    return (
      <FoundClip
        state={state}
        headingRef={resultHeading}
        maxFileMb={maxFileMb}
        onExpire={() => {
          setState({ kind: "expired" });
          pendingFocus.current = "expired";
        }}
        onAnother={reset}
      />
    );
  }

  if (state.kind === "expired") {
    return (
      <div className="space-y-4 py-6 text-center">
        <ClockIcon className="mx-auto size-8 text-zinc-400" />
        <h2 ref={expiredHeading} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
          This clip has expired
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Its text and file have been deleted.</p>
        <button type="button" onClick={reset} className={btnPrimary}>
          Get another clip
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (digits.every((d) => d)) void lookup(digits.join(""));
      }}
    >
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Enter a code</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Type or paste the 6-digit code you were given.</p>
      </div>

      <CodeInput
        ref={codeInput}
        digits={digits}
        onChange={setDigits}
        onComplete={(code) => void lookup(code)}
        disabled={busy || blocked}
        invalid={state.kind === "error"}
        describedBy={statusId}
      />

      {/* Fixed-height status area: loading, error or wait notice. No layout jump. */}
      <div id={statusId} className="min-h-12" aria-live="polite">
        {busy && (
          <p className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Spinner /> Looking up the clip…
          </p>
        )}
        {state.kind === "error" && !blocked && (
          <p className={errorBox} role="alert">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        )}
        {blocked && (
          <RateLimitNotice
            until={blockedUntil}
            onDone={() => {
              setBlockedUntil(null);
              pendingFocus.current = "input";
            }}
          />
        )}
      </div>

      {/* Visible submit for keyboard users who prefer Enter / a button. */}
      <div className="flex justify-center">
        <button type="submit" className={btnSecondary} disabled={busy || blocked || !digits.every((d) => d)}>
          Get clip
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function FoundClip({
  state,
  headingRef,
  maxFileMb,
  onExpire,
  onAnother,
}: {
  state: Extract<State, { kind: "found" }>;
  headingRef: React.Ref<HTMLHeadingElement>;
  maxFileMb: number;
  onExpire: () => void;
  onAnother: () => void;
}) {
  const { clip, code, expiresAt } = state;
  const textLabelId = useId();

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
          Clip <span className="font-mono tracking-widest">{code}</span>
        </h2>
        <ExpiryLine until={expiresAt} onExpire={onExpire} />
      </div>

      {clip.text !== null && (
        <section className="space-y-2" aria-labelledby={textLabelId}>
          <div className="flex items-center justify-between gap-2">
            <h3 id={textLabelId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Text
            </h3>
            <CopyButton value={clip.text} label="Copy text" className={`${btnSecondary} px-3 py-1.5`} />
          </div>
          {/* Plain text only (React escapes it); never parsed as HTML. */}
          <div
            tabIndex={0}
            role="textbox"
            aria-readonly="true"
            aria-multiline="true"
            aria-labelledby={textLabelId}
            className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {clip.text}
          </div>
        </section>
      )}

      {clip.fileName !== null && <FileCard code={code} name={clip.fileName} size={clip.fileSize} maxFileMb={maxFileMb} />}

      <div className="flex justify-center">
        <button type="button" onClick={onAnother} className={btnSecondary}>
          Get another clip
        </button>
      </div>
    </div>
  );
}

function FileCard({ code, name, size, maxFileMb }: { code: string; name: string; size: number | null; maxFileMb: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    const res = await getDownloadUrl(code);
    setBusy(false);
    if (res.ok) {
      // Signed, 60-second URL with "attachment" disposition: the page stays, the file downloads.
      window.location.assign(res.data.url);
    } else if (res.error.kind === "rate_limited") {
      setBlockedUntil(Date.now() + res.error.retryAfterSeconds * 1000);
    } else {
      setError(errorMessage(res.error, { maxFileMb }));
    }
  }

  return (
    <section className={`${card} space-y-3`} aria-label="File">
      {/* Phones: name on its own full-width row, button below. Wider screens: one row. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FileIcon className="size-6 shrink-0 text-zinc-500" />
          <div className="min-w-0 flex-1">
            {/* Breaks only where a word can't fit (very long names), not mid-word otherwise. */}
            <p className="line-clamp-3 font-medium [overflow-wrap:anywhere]" title={name}>
              {name}
            </p>
            {size !== null && <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatBytes(size)}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={busy || blockedUntil !== null}
          className={`${btnPrimary} w-full shrink-0 sm:w-auto`}
        >
          {busy ? <Spinner /> : <DownloadIcon />}
          {busy ? "Preparing…" : "Download"}
        </button>
      </div>
      <div aria-live="polite">
        {error && (
          <p className={errorBox} role="alert">
            <AlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
        {blockedUntil !== null && <RateLimitNotice until={blockedUntil} onDone={() => setBlockedUntil(null)} />}
      </div>
    </section>
  );
}
