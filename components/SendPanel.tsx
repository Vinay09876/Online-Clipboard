"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  completeUpload,
  createClip,
  errorMessage,
  toClientTime,
  uploadFile,
  type ApiError,
  type UploadOutcome,
  type UploadTarget,
} from "@/lib/apiClient";
import { ExpiryLine, RateLimitNotice } from "./Countdown";
import { CopyButton } from "./CopyButton";
import { FileDropzone } from "./FileDropzone";
import { AlertIcon, ClockIcon, LinkIcon, Spinner } from "./icons";
import { ProgressBar } from "./ProgressBar";
import { btnPrimary, btnSecondary, errorBox } from "./ui";

export type SendLimits = {
  maxTextLength: number;
  maxFileBytes: number;
  maxFileMb: number;
  expiryMinutes: number;
};

/** A created file clip whose upload isn't finished yet. Its code is NOT shown until complete succeeds. */
type Pending = { code: string; expiresAt: string; upload: UploadTarget };

type State =
  | { kind: "compose" }
  | { kind: "working"; step: "creating" | "uploading" | "completing"; loaded: number; total: number }
  | { kind: "failed"; step: "create" | "upload" | "complete"; message: string; retryable: boolean; pending?: Pending }
  | { kind: "done"; code: string; expiresAt: number }
  | { kind: "expired" };

const UPLOAD_MESSAGES: Record<Exclude<UploadOutcome, { ok: true }>["reason"], string> = {
  aborted: "Upload canceled.",
  timeout: "The upload took too long and was stopped.",
  network: "The upload was interrupted. Check your connection and try again.",
  too_large: "", // filled in with the limit below
  failed: "The upload didn't go through. Please try again.",
};

export function SendPanel({ limits }: { limits: SendLimits }) {
  const { maxTextLength, maxFileBytes, maxFileMb, expiryMinutes } = limits;

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<State>({ kind: "compose" });
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const abortUpload = useRef<(() => void) | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const failedHeading = useRef<HTMLHeadingElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const textareaId = useId();
  const counterId = useId();

  // Focus management after state changes.
  const pendingFocus = useRef<"textarea" | "done" | "failed" | "cancel" | null>(null);
  useEffect(() => {
    const t = pendingFocus.current;
    if (!t) return;
    pendingFocus.current = null;
    ({ textarea: textareaRef, done: doneHeading, failed: failedHeading, cancel: cancelButton })[t].current?.focus();
  });

  // Warn before leaving the page while an upload is running.
  const uploading = state.kind === "working";
  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  // Abort a running upload if the component goes away.
  useEffect(() => () => abortUpload.current?.(), []);

  // Text typed (or restored by the browser) before React finished loading is in the box but
  // not in state, which would leave "Create clip" disabled until the next keystroke. Adopt it
  // once, right after hydration. Slow phones are where this happens.
  useEffect(() => {
    const early = textareaRef.current?.value ?? "";
    if (early) setText(early.slice(0, maxTextLength));
  }, [maxTextLength]);

  const hasText = text.trim().length > 0;
  const canSend = (hasText || file !== null) && blockedUntil === null && state.kind === "compose";

  // --- flow ---------------------------------------------------------------

  function fail(step: "create" | "upload" | "complete", error: ApiError, pending?: Pending) {
    if (error.kind === "rate_limited") {
      setBlockedUntil(Date.now() + error.retryAfterSeconds * 1000);
      if (!pending) {
        // Nothing was created: back to the form, "Create clip" stays disabled until the wait is over.
        setState({ kind: "compose" });
        return;
      }
    }
    const retryable = error.kind !== "too_large" && error.kind !== "bad_request" && error.kind !== "unsupported";
    setState({ kind: "failed", step, message: errorMessage(error, { maxFileMb }), retryable, pending });
    pendingFocus.current = "failed";
  }

  function finish(code: string, expiresAt: string) {
    setState({ kind: "done", code, expiresAt: toClientTime(expiresAt) });
    pendingFocus.current = "done";
  }

  async function send() {
    setState({ kind: "working", step: "creating", loaded: 0, total: 0 });
    const res = await createClip({
      ...(hasText ? { text } : {}),
      ...(file ? { file: { name: file.name, size: file.size } } : {}),
    });
    if (!res.ok) return fail("create", res.error);

    const { code, expiresAt, upload } = res.data;
    if (!file) return finish(code, expiresAt);
    if (!upload) return fail("create", { kind: "unexpected" });
    await runUpload({ code, expiresAt, upload });
  }

  async function runUpload(p: Pending) {
    if (!file) return;
    setState({ kind: "working", step: "uploading", loaded: 0, total: file.size });
    pendingFocus.current = "cancel";

    const { done, abort } = uploadFile(p.upload.signedUrl, file, (loaded, total) =>
      setState((s) => (s.kind === "working" && s.step === "uploading" ? { ...s, loaded, total } : s)),
    );
    abortUpload.current = abort;
    const outcome = await done;
    abortUpload.current = null;

    if (!outcome.ok) {
      const tooLarge = outcome.reason === "too_large";
      setState({
        kind: "failed",
        step: "upload",
        message: tooLarge ? `That file is too large. The limit is ${maxFileMb} MB.` : UPLOAD_MESSAGES[outcome.reason],
        retryable: !tooLarge,
        pending: p,
      });
      pendingFocus.current = "failed";
      return;
    }
    await runComplete(p);
  }

  async function runComplete(p: Pending) {
    setState({ kind: "working", step: "completing", loaded: file?.size ?? 0, total: file?.size ?? 0 });
    const res = await completeUpload(p.code);
    if (res.ok) return finish(p.code, p.expiresAt);
    // 409 = the object isn't there: upload again. Anything else: retry complete.
    fail(res.error.kind === "not_uploaded" ? "upload" : "complete", res.error, p);
  }

  function retry() {
    if (state.kind !== "failed") return;
    if (state.step === "create" || !state.pending) return void send();
    if (state.step === "upload") return void runUpload(state.pending);
    void runComplete(state.pending);
  }

  function backToEdit() {
    setState({ kind: "compose" });
    pendingFocus.current = "textarea";
  }

  function sendAnother() {
    setText("");
    setFile(null);
    backToEdit();
  }

  // --- views --------------------------------------------------------------

  if (state.kind === "done") {
    return (
      <SentCode
        code={state.code}
        expiresAt={state.expiresAt}
        headingRef={doneHeading}
        onExpire={() => setState({ kind: "expired" })}
        onAnother={sendAnother}
      />
    );
  }

  if (state.kind === "expired") {
    return (
      <div className="space-y-4 py-6 text-center">
        <ClockIcon className="mx-auto size-8 text-zinc-400" />
        <h2 className="text-lg font-semibold">Your clip has expired</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">The code no longer works and the content was deleted.</p>
        <button type="button" onClick={sendAnother} className={btnPrimary}>
          Send another
        </button>
      </div>
    );
  }

  const working = state.kind === "working";
  const formDisabled = state.kind !== "compose";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) void send();
      }}
    >
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={textareaId} className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Text
          </label>
          <span
            id={counterId}
            className={`text-xs tabular-nums ${text.length >= maxTextLength ? "text-red-700 dark:text-red-300" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {text.length.toLocaleString("en-US")} / {maxTextLength.toLocaleString("en-US")}
          </span>
        </div>
        <textarea
          ref={textareaRef}
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          maxLength={maxTextLength}
          disabled={formDisabled}
          aria-describedby={counterId}
          rows={6}
          placeholder="Paste or type anything…"
          spellCheck={false}
          className="block w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:border-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      <FileDropzone file={file} onChange={setFile} maxBytes={maxFileBytes} maxMb={maxFileMb} disabled={formDisabled} />

      {/* Status area: progress, error, or rate-limit wait. Reserved height avoids jumps. */}
      <div className="min-h-14 space-y-3" aria-live="polite">
        {working && state.step === "creating" && (
          <p className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Spinner /> Creating your clip…
          </p>
        )}
        {working && state.step !== "creating" && (
          <ProgressBar
            loaded={state.loaded}
            total={state.total}
            label={state.step === "completing" ? "Finishing up…" : "Uploading file…"}
          />
        )}
        {state.kind === "failed" && (
          <div className="space-y-3">
            <div className={errorBox} role="alert">
              <AlertIcon className="mt-0.5 size-4 shrink-0" />
              <div>
                <h2 ref={failedHeading} tabIndex={-1} className="font-medium focus:outline-none">
                  {state.step === "create" ? "Couldn't create the clip" : "Couldn't finish sending the file"}
                </h2>
                <p>{state.message}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {state.retryable && (
                <button type="button" onClick={retry} className={btnPrimary} disabled={blockedUntil !== null}>
                  {state.step === "upload" ? "Retry upload" : "Try again"}
                </button>
              )}
              <button type="button" onClick={backToEdit} className={btnSecondary}>
                {state.pending ? "Start over" : "Edit"}
              </button>
            </div>
          </div>
        )}
        {blockedUntil !== null && <RateLimitNotice until={blockedUntil} onDone={() => setBlockedUntil(null)} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {working && state.step === "uploading" ? (
          <button ref={cancelButton} type="button" onClick={() => abortUpload.current?.()} className={btnSecondary}>
            Cancel upload
          </button>
        ) : (
          <button type="submit" disabled={!canSend} className={`${btnPrimary} min-w-36`}>
            {working ? <Spinner /> : null}
            {working ? "Sending…" : "Create clip"}
          </button>
        )}
        <p className="text-xs text-zinc-600 dark:text-zinc-400">Expires {expiryMinutes} minutes after creation.</p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------

function SentCode({
  code,
  expiresAt,
  headingRef,
  onExpire,
  onAnother,
}: {
  code: string;
  expiresAt: number;
  headingRef: React.Ref<HTMLHeadingElement>;
  onExpire: () => void;
  onAnother: () => void;
}) {
  // The code goes in the URL fragment (#), which browsers never send to the server.
  const link = () => `${window.location.origin}/#${code}`;

  return (
    <div className="space-y-5 text-center">
      <h2 ref={headingRef} tabIndex={-1} className="text-sm font-medium text-zinc-600 focus:outline-none dark:text-zinc-400">
        Your code
      </h2>
      <p
        className="font-mono text-5xl font-bold tracking-[0.2em] text-zinc-900 tabular-nums sm:text-6xl dark:text-zinc-50"
        aria-label={`Code ${code.split("").join(" ")}`}
        data-testid="clip-code"
      >
        {code}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <CopyButton value={code} label="Copy code" />
        <CopyButton value={link} label="Copy link" icon={<LinkIcon />} />
      </div>
      <ExpiryLine until={expiresAt} onExpire={onExpire} />
      <p className="mx-auto max-w-sm text-xs text-zinc-600 dark:text-zinc-400">
        Anyone with this code or link can open the clip until it expires. Share it only with the person it&apos;s for.
      </p>
      <button type="button" onClick={onAnother} className={btnSecondary}>
        Send another
      </button>
    </div>
  );
}
