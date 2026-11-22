# Performance

Numbers to compare against later (PageSpeed Insights: pagespeed.web.dev, "Mobile").
Measured 2026-11-22 with Lighthouse 12.8.2, mobile preset (slow 4G, 4× CPU slowdown), from India.

## Pages

| Page | Where | Perf | A11y | BP | SEO* | TTFB | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | live Vercel | 93 | 100 | 100 | 58 | 98 ms | 1.2 s | 1.5 s | 170 ms | 0 |
| `/guides` | live Vercel | 100 | 100 | 100 | 66 | 117 ms | 1.0 s | 1.0 s | 40 ms | 0 |
| a guide | live Vercel | 100 | 100 | 100 | 66 | 88 ms | 1.0 s | 1.0 s | 60 ms | 0 |
| `/` | local `next start` | 95-96 | 100 | 100 | 100 | ~10-45 ms | 0.9-1.0 s | 2.5-2.6 s | 120-140 ms | 0 |
| `/guides` | local | 94 | 100 | 100 | 100 | ~10 ms | 0.9 s | 2.4 s | 210-230 ms | 0 |
| a guide | local | 85-93 | 100 | 100 | 100 | ~10 ms | 0.9-1.2 s | 1.3-2.4 s | 250-590 ms | 0 |

\* SEO is low on the live site only because a temporary host is deliberately `noindex`.
Local runs share the CPU with everything else on this computer, hence the spread; the live
numbers are the ones to compare. No render-blocking resources; total page weight ~210 KB.

## Could pages be cached at a CDN?

Every page is rendered per request because of the nonce-based CSP. Options looked at:

| Option | Keeps the CSP strict? | Verdict |
|---|---|---|
| Cache HTML with its nonce | **No**: a cached nonce is public and the same for everyone, so an injected script could use it | Rejected |
| Hash-based CSP via Next.js `experimental.sri` | **No** for App Router pages: SRI only covers external script *files*; every page also has inline `self.__next_f.push(…)` data scripts that would need per-page hashes, which Next.js doesn't generate; the documented SRI policy (`script-src 'self'`) would block them or need `'unsafe-inline'` | Rejected (and experimental) |
| `'unsafe-inline'` instead of nonces | **No** | Rejected |
| Keep rendering per request | Yes | **Kept**: the pages do no database work, so the server answers in ~100 ms on Vercel |

Source: Next.js 16 docs, `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
("Static vs Dynamic Rendering with CSP", "Subresource Integrity (Experimental)").

## API round trips (Supabase)

`db/005_fast_paths.sql` combines the checks of each API call into one database call:

| Endpoint | Before | After 005 |
|---|---|---|
| POST /api/clips (text) | 4 | 2 |
| POST /api/clips (file) | 6 | 3 (incl. the signed upload URL) |
| GET /api/clips/[code] | 2 (3 on a wrong code) | 1 |
| POST …/complete | 5 | 3 (incl. the storage check) |
| GET …/download | 5 | 2 (incl. signing the URL) |
| GET /api/health | 3 | 2 (storage + DB checks in parallel) |

Timings before (smoke test from India, medians): Vercel create 290 ms, fetch 193 ms, download link
235 ms; Netlify create 3,258 ms, fetch 2,007 ms, file create 5,824 ms, complete 3,976 ms,
download link 3,912 ms. After applying 005: run `npm run smoke:prod -- <url> --skip-spoof-test`
on both hosts and add the numbers here.
