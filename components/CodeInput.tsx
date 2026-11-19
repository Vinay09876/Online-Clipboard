"use client";

import { useImperativeHandle, useRef } from "react";

export const CODE_LENGTH = 6;
export const emptyDigits = (): string[] => Array<string>(CODE_LENGTH).fill("");

export type CodeInputHandle = { focus: (index?: number) => void };

/**
 * Six one-digit boxes.
 *  - digits only, auto-advance, Backspace goes back, arrow keys / Home / End move
 *  - pasting (or SMS autofill of) a whole code fills every box
 *  - calls onComplete(code) whenever the 6th digit makes the code complete
 */
export function CodeInput({
  digits,
  onChange,
  onComplete,
  disabled,
  invalid,
  describedBy,
  ref,
}: {
  digits: string[];
  onChange: (digits: string[]) => void;
  onComplete: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  ref?: React.Ref<CodeInputHandle>;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useImperativeHandle(ref, () => ({
    focus: (index = 0) => inputs.current[index]?.focus(),
  }));

  function focusAt(i: number) {
    const el = inputs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))];
    el?.focus();
    el?.select();
  }

  /** Writes `chars` starting at box `start`, then advances focus. */
  function fill(start: number, chars: string) {
    const only = chars.replace(/\D/g, "");
    if (!only) return;
    const next = [...digits];
    let i = start;
    for (const ch of only) {
      if (i >= CODE_LENGTH) break;
      next[i++] = ch;
    }
    onChange(next);
    focusAt(i >= CODE_LENGTH ? CODE_LENGTH - 1 : i);
    if (next.every((d) => d !== "")) onComplete(next.join(""));
  }

  function clearAt(i: number) {
    const next = [...digits];
    next[i] = "";
    onChange(next);
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Backspace":
        e.preventDefault();
        if (digits[i]) clearAt(i);
        else if (i > 0) {
          clearAt(i - 1);
          focusAt(i - 1);
        }
        break;
      case "Delete":
        e.preventDefault();
        clearAt(i);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusAt(i - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusAt(i + 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(CODE_LENGTH - 1);
        break;
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="6-digit code" aria-describedby={describedBy}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
          aria-invalid={invalid || undefined}
          value={d}
          disabled={disabled}
          onFocus={(e) => e.currentTarget.select()}
          onKeyDown={(e) => onKeyDown(i, e)}
          onChange={(e) => {
            const v = e.currentTarget.value;
            if (v === "") clearAt(i);
            else fill(i, v.length > 1 && d ? v.replace(d, "") || v : v);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text").replace(/\D/g, "");
            fill(text.length >= CODE_LENGTH ? 0 : i, text);
          }}
          className={`h-14 w-11 rounded-lg border bg-white text-center font-mono text-2xl font-semibold text-zinc-900 caret-indigo-600 transition-colors sm:h-16 sm:w-12 sm:text-3xl dark:bg-zinc-950 dark:text-zinc-50 focus-visible:border-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 disabled:opacity-50 ${
            invalid ? "border-red-400 dark:border-red-700" : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
