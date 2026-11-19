"use client";

import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { CheckIcon, CopyIcon } from "./icons";
import { btnSecondary } from "./ui";

type Status = "idle" | "copied" | "failed";

/** Copies `value`; shows "Copied" for 2 s and announces it to screen readers. */
export function CopyButton({
  value,
  label,
  icon,
  className = btnSecondary,
}: {
  /** The text, or a function that builds it at click time (e.g. needs window.location). */
  value: string | (() => string);
  label: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  async function onClick() {
    const text = typeof value === "function" ? value() : value;
    setStatus((await copyText(text)) ? "copied" : "failed");
  }

  return (
    <>
      <button type="button" onClick={onClick} className={className}>
        {status === "copied" ? <CheckIcon /> : (icon ?? <CopyIcon />)}
        {/* Fixed-width label area so the button doesn't change size. */}
        <span className="inline-grid">
          <span className="col-start-1 row-start-1" aria-hidden={status !== "idle"}>
            <span className={status === "idle" ? "" : "invisible"}>{label}</span>
          </span>
          <span className={`col-start-1 row-start-1 ${status === "idle" ? "invisible" : ""}`} aria-hidden="true">
            {status === "failed" ? "Copy failed" : "Copied"}
          </span>
        </span>
      </button>
      <span className="sr-only" role="status">
        {status === "copied" ? "Copied to clipboard" : status === "failed" ? "Copy failed. Select the text and copy it manually." : ""}
      </span>
    </>
  );
}
