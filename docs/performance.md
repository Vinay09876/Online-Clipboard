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

## Further speed options for Netlify (Step 7 review, 2026-11-22)

Netlify Free runs functions in Ohio; the database is in Mumbai. Each database round trip costs
roughly **0.6-0.8 s** from Ohio (measured: the Step 5 numbers divided by the number of trips).
Expected after 005 is deployed (not measured yet, because Netlify still runs Step 5 code):
create ≈ 2 trips ≈ **1.4-1.8 s**, open ≈ 1 trip ≈ **0.8-1.0 s**, download link ≈ 2 trips ≈ **1.4-1.8 s**.
Measure with `docs/launch-day-netlify.md` section b before choosing anything below.

| Option | Saves (from India) | Risk / effort | Verdict |
|---|---|---|---|
| **Move the database next to the functions**: a new free Supabase project in `us-east-2` (Ohio); run `db/001`-`005`, create the bucket, the cron job and Vault secrets, switch 3 env vars. Clips live 30 min, so nothing needs migrating | every trip ~0.7 s → a few ms: create ≈ **0.4-0.6 s**, open ≈ **0.3-0.5 s** (the remaining time is India ↔ Ohio) | low code risk (no code change), ~1 hour of clicks, a maintenance window of minutes | **Recommended** if section b lands in the middle or bottom row; also cuts Netlify compute credits per request by ~60-70 % |
| Merge "rate limit + caps" and "insert" into one function for text clips (a `db/006`) | create 2 → 1 trip: **−0.6-0.8 s** on text creates only | medium: the collision-retry path needs care and new tests | Only if staying with the Mumbai database |
| Cache the "open clip" response at the CDN | would save a trip | **unsafe**: bypasses per-IP rate limits and expiry, and puts private clips in a shared cache | Rejected |
| Sign download URLs without calling Storage | 1 trip on downloads | needs the storage signing secret in the app; new key model doesn't expose it | Rejected |
| Turn off the after-response clean-up on creates | 0 for the visitor (it runs after the answer) but ~1 s of compute credits per create | low; the 10-minute job already cleans | Possible later for credits, not for speed |

No code changes were made for speed in this step: the measurement after deploying 005 decides.
