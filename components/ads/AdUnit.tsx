"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * The manual ad unit (<ins class="adsbygoogle">). Only rendered by <AdSlot>, which decides
 * whether ads are active. Lazy: the ad is requested only when the slot comes within about
 * one screen of the viewport. A Client Component, so it also works after client-side
 * navigation between guides (an inline <script> would not run again).
 */
export function AdUnit({ client, slot }: { client: string; slot: string }) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let requested = false;
    const request = () => {
      // Guard against a second push for the same element (React Strict Mode, re-renders).
      if (requested || el.getAttribute("data-adsbygoogle-status")) return;
      requested = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Ad blockers or a failed library load: leave the reserved space empty.
      }
    };
    if (!("IntersectionObserver" in window)) {
      request();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          request();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ins
      ref={ref}
      className="adsbygoogle"
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
