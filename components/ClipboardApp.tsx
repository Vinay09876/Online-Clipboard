"use client";

import { useEffect, useRef, useState } from "react";
import { ReceivePanel, type ReceivePanelHandle } from "./ReceivePanel";
import { SendPanel, type SendLimits } from "./SendPanel";
import { focusRing } from "./ui";

type Tab = "send" | "receive";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "send", label: "Send" },
  { id: "receive", label: "Receive" },
];

/**
 * Send / Receive tabs. Both panels stay mounted (only hidden), so switching tabs never
 * loses a typed text or interrupts an upload.
 * Opening "/#123456" switches to Receive, fetches that code, and removes the fragment.
 */
export function ClipboardApp({ limits }: { limits: SendLimits }) {
  const [tab, setTab] = useState<Tab>("send");
  const receive = useRef<ReceivePanelHandle>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ send: null, receive: null });

  // Open a code from the URL fragment, now and whenever the fragment changes.
  useEffect(() => {
    function openFromHash() {
      const m = /^#(\d{6})$/.exec(window.location.hash);
      if (!m) return;
      history.replaceState(null, "", window.location.pathname + window.location.search);
      setTab("receive");
      receive.current?.open(m[1]);
    }
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  function onTabKeyDown(e: React.KeyboardEvent) {
    const i = TABS.findIndex((t) => t.id === tab);
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div role="tablist" aria-label="Mode" className="grid grid-cols-2 gap-1 border-b border-zinc-200 p-1.5 dark:border-zinc-800" onKeyDown={onTabKeyDown}>
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${focusRing} ${
                selected
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={tab !== t.id}
          className="p-4 sm:p-6"
        >
          {t.id === "send" ? <SendPanel limits={limits} /> : <ReceivePanel ref={receive} maxFileMb={limits.maxFileMb} />}
        </div>
      ))}
    </div>
  );
}
