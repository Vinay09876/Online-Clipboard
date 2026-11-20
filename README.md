# Online Clipboard

Share text or a file between devices with a **6-digit code**. Paste or drop something on
one device, type the code (or open the link) on another. Everything expires and is
deleted automatically. No accounts, no cookies, no analytics.

## Features

- **Send** text (up to 100,000 characters) and/or one file (up to 25 MB), get a 6-digit code
  and a shareable link (`/#123456`; the code is in the URL fragment, so it never reaches
  server logs).
- **Receive** by typing the code (6-box input with paste and SMS autofill) or opening the link.
- Upload progress with cancel/retry; files go **straight from the browser to storage**
  through a one-time signed URL (no keys in the browser, no 4.5 MB serverless body limit).
- Live expiry countdowns; expired clips are removed by a scheduled clean-up job.
- Abuse protection: per-IP rate limits stored in Postgres, global caps on live clips and
  storage, a monthly download (egress) budget, a strict nonce-based Content-Security-Policy,
  security headers, and no raw errors ever sent to the client.
- Mobile-first, keyboard accessible, dark mode.

## Tech stack

Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4,
Supabase (Postgres + Storage) via `@supabase/supabase-js`, Playwright for browser tests.
Hosting target: Vercel Hobby + Supabase Free.

## How it works

The browser only talks to this app's own `/api/*` routes, never to Supabase with a key.
API routes use the Supabase **service role key** (server only). Every database table
has Row Level Security on with no policies, so the public keys can't read anything.

- **Text clip:** `POST /api/clips` → row in `clips` with a random unused 6-digit code.
- **File clip:** `POST /api/clips` creates a *pending* row and returns a signed upload URL →
  the browser `PUT`s the file there → `POST /api/clips/[code]/complete` checks the real size
  and marks it ready → `GET /api/clips/[code]/download` returns a 60-second signed
  download link (and counts the bytes against the monthly budget).
- **Expiry:** every read filters on `expires_at > now()`. Supabase `pg_cron` calls
  `POST /api/cron/cleanup` every 10 minutes to delete expired rows, their files, orphaned
  files and old rate-limit counters.

## Local setup

Requirements: Node.js 20+ (22 recommended), a free Supabase project.

```bash
npm install
cp .env.example .env.local      # then fill in the values (see comments in the file)
```

1. In Supabase → **SQL Editor**, run `db/001_init.sql` … `db/004_usage.sql` in order.
2. Put the project URL and a secret key into `.env.local`; generate `CRON_SECRET` and
   `IP_HASH_SALT` with:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. `npm run dev`, then open the URL it prints. `/api/health` should show `{"ok":true}`.

Deploying: see **[docs/deploy.md](docs/deploy.md)**. SEO and indexing: **[docs/seo.md](docs/seo.md)**.
Growth roadmap: **[docs/growth-plan.md](docs/growth-plan.md)**.

**Search engines:** the site is `noindex` unless `SITE_URL` is a real https domain
(never on `*.vercel.app`, `*.netlify.app`, localhost). `ALLOW_INDEXING=false` forces `noindex`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm run test:files -- <url>` | File upload/download API tests against a running server |
| `npm run test:collisions` | Code-collision logic against the database |
| `npm run test:security` | Rate limits, caps, request hardening, headers (starts its own servers; builds first) |
| `npm run test:egress` | Monthly download budget (starts its own server; builds first) |
| `npm run test:e2e` | Playwright browser tests incl. CSP and SEO checks (builds once, starts 4 servers with different `SITE_URL` settings) |
| `npm run fixtures:cleanup -- seed\|verify` | Test data for the clean-up endpoint |
| `npm run smoke:prod -- <url>` | Smoke test of a deployed site (no keys needed) |
| `npm run scan:secrets` | Search the whole git history for leaked secrets |
| `npm run icons:generate` | Regenerate the PNG/ICO icons from `app/icon.svg` |

All test scripts run against the Supabase project in `.env.local` (currently the same one production uses) and delete what they create. See "Living with one database" in [docs/deploy.md](docs/deploy.md) before running them on a live site.

## Project structure

```
app/                 pages (/, /terms), layout, API routes
  api/clips/         create, fetch, complete, download
  api/cron/cleanup/  clean-up endpoint (secret-protected)
  api/health/        health check
components/          client UI (Send/Receive panels, code input, countdown, …)
lib/                 server logic (clips, files, cleanup, rate limits, caps, egress, config)
                     + site.ts (SITE_URL / indexing switch) and sitePages.ts (sitemap page list)
                     + browser-safe helpers (apiClient, clipboard, useNow)
db/                  SQL migrations, run in order in the Supabase SQL Editor
docs/                deployment and clean-up scheduling guides
scripts/             test and maintenance scripts (tsx)
e2e/                 Playwright tests
proxy.ts             per-request CSP nonce; X-Robots-Tag noindex on non-indexable hosts
```

## Limits (defaults, all configurable in env)

| | Default |
|---|---|
| Clip lifetime | 30 minutes |
| Text / file size | 100,000 characters / 25 MB |
| Live clips (whole service) | 200 |
| Stored files (whole service) | 800 MB |
| Downloads per month | 4,000 MB |
| Failed code lookups | 10 per 10 minutes per IP |
| Creates | 20 per 10 minutes per IP (file clips: 5) |

6-digit codes can be guessed by a determined attacker over time. Clips are **not**
end-to-end encrypted. Don't use this for passwords or sensitive documents.

## License

Personal, non-commercial project (Vercel Hobby). Add a license if you publish the code.
