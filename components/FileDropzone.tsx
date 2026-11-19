"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatBytes } from "@/lib/apiClient";
import { FileIcon, UploadIcon, XIcon } from "./icons";
import { btnGhost, focusRing } from "./ui";

/**
 * Optional single-file picker with drag and drop.
 * Rejects empty files and files over the limit before anything is sent.
 */
export function FileDropzone({
  file,
  onChange,
  maxBytes,
  maxMb,
  disabled,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  maxBytes: number;
  maxMb: number;
  disabled?: boolean;
}) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dropping a file outside the zone must not make the browser open it and leave the page.
  useEffect(() => {
    const stop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  function accept(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (files.length > 1) return setError("Please choose one file at a time.");
    const f = files[0];
    if (f.size === 0) return setError(`"${f.name}" is empty. Choose a file with some content.`);
    if (f.size > maxBytes) {
      return setError(`"${f.name}" is ${formatBytes(f.size)}. The limit is ${maxMb} MB.`);
    }
    setError(null);
    onChange(f);
  }

  // After "Remove", the picker is rendered again: move focus to it.
  const focusPickerNext = useRef(false);
  useEffect(() => {
    if (!file && focusPickerNext.current) {
      focusPickerNext.current = false;
      inputRef.current?.focus();
    }
  }, [file]);

  function remove() {
    focusPickerNext.current = true;
    setError(null);
    onChange(null);
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
        <FileIcon className="size-5 shrink-0 text-zinc-500" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-all text-sm font-medium" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={disabled}
          className={`${btnGhost} px-2 py-1.5`}
          aria-label={`Remove file ${file.name}`}
        >
          <XIcon />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) accept(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-center text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-indigo-500 ${
          dragging
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <UploadIcon className="size-5 text-zinc-500" />
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Add a file <span className="font-normal text-zinc-600 dark:text-zinc-400">(optional)</span>
        </span>
        <span id={hintId} className="text-xs text-zinc-600 dark:text-zinc-400">
          Drop it here or click to choose · up to {maxMb} MB
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className={`sr-only ${focusRing}`}
          disabled={disabled}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          onChange={(e) => accept(e.currentTarget.files)}
        />
      </label>
      <p id={errorId} role="alert" className="mt-1.5 min-h-5 text-sm text-red-700 dark:text-red-300">
        {error}
      </p>
    </div>
  );
}
