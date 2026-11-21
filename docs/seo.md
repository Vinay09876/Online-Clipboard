# SEO: how it works, and the checklist for when the domain arrives

## The single switch: `SITE_URL` (+ `ALLOW_INDEXING`)

All SEO behaviour comes from **`lib/site.ts`**. Nothing else decides whether the site may be indexed.

| `SITE_URL` | `ALLOW_INDEXING` | Indexable? | Why |
|---|---|---|---|
| not set | any | **no** | no absolute base URL |
| `https://<x>.vercel.app`, `https://<x>.netlify.app` | any | **no** | temporary platform host |
| `http://localhost:3000`, an IP address, `*.localhost` | any | **no** | local / not a domain |
| `http://example.com` (not https) | any | **no** | indexing requires https |
| `https://example.com` | empty or `true` | **yes** | real domain |
| `https://example.com` | `false` | **no** | kill switch |

`SITE_URL` must be the bare origin (`https://example.com`, no path). An invalid value stops
the app at startup with a clear message (validated in `lib/config.ts`).

### What changes with the switch

| Output | Not indexable | Indexable |
|---|---|---|
| `<meta name="robots">` on every page | `noindex, nofollow` | `index, follow` |
| `X-Robots-Tag` header on pages, robots.txt, sitemap, icons (from `proxy.ts`) | `noindex, nofollow` | not sent |
| `X-Robots-Tag` on `/api/*` (from `next.config.ts`) | `noindex, nofollow` | `noindex, nofollow` (always) |
| `/robots.txt` | `Disallow: /`, no sitemap line | `Allow: /`, `Disallow: /api/`, `Sitemap: <SITE_URL>/sitemap.xml` |
| `/sitemap.xml` | empty `<urlset>` | every page in `lib/sitePages.ts`, absolute URLs |
| `<link rel="canonical">`, `og:url` | present if `SITE_URL` is set (absolute), else omitted | absolute, under `SITE_URL` |

Values are read when the server starts. **Changing them needs a redeploy.**

**Recommended now:** set `SITE_URL` to your current temporary address (e.g.
`https://<your-project>.vercel.app`). Share previews (WhatsApp, X, Slack) then show the right
image and link, and the site still stays out of search engines because the host is temporary.

## Where things live

| File | Purpose |
|---|---|
| `lib/site.ts` | `SITE_URL` parsing, `INDEXABLE`, `absoluteUrl()`, `pageUrls()` (canonical + Open Graph + Twitter per page), `serializeJsonLd()`, site name/description |
| `lib/sitePages.ts` | **The one list of public pages** → sitemap. Add every new public page here. |
| `app/layout.tsx` | `metadataBase`, title template (`%s \| Online Clipboard`), default description, robots meta, Open Graph/Twitter defaults; skip link, header/main/footer landmarks |
| `app/page.tsx` | home: the one `<h1>`, canonical, JSON-LD `WebApplication` (with the CSP nonce) |
| `app/robots.ts`, `app/sitemap.ts` | robots.txt and sitemap.xml (rendered per request) |
| `app/opengraph-image.tsx` | 1200×630 share image (built once with `next/og`, bundled font, no external assets) |
| `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/icon-*.png` | icons; PNG/ICO generated from the SVG with `npm run icons:generate` |
| `app/manifest.ts` | web app manifest (`/manifest.webmanifest`) |
| `e2e/seo.spec.ts` | tests for all of the above, against 4 servers with different settings |

### Adding a new public page (Steps 2-3)

1. Create the page with `export const metadata = { title: "…", description: "…", ...pageUrls("/path", "Share title") }`.
   Use `pageUrls`; don't hand-write `openGraph`. (Next.js merges metadata shallowly, so a
   hand-written `openGraph` would drop the site name and the share image.)
2. Add `{ path: "/path", changeFrequency, priority }` to `lib/sitePages.ts` (guides are added automatically from `content/guides/index.ts`).
3. Keep exactly one `<h1>` per page and don't skip heading levels (the test checks `/`, `/terms`
   and the 404 page; add new pages to that test).

## Step 7 checklist: when the domain arrives

Assume the domain is `example.com` and the site should live at `https://example.com`
(apex), with `www` redirecting to it.

1. **Connect the domain** to the host (Netlify after Step 5): add `example.com` and
   `www.example.com`, set `example.com` as primary, enable HTTPS, and wait until both load over https.
2. **Set the env vars** on the host: `SITE_URL=https://example.com`; leave `ALLOW_INDEXING` empty.
   **Redeploy.**
3. **Verify on the live site** (replace the domain):
   ```bash
   curl -s https://example.com/robots.txt
   # expect: Allow: /   Disallow: /api/   Sitemap: https://example.com/sitemap.xml

   curl -s https://example.com/sitemap.xml
   # expect: <loc>https://example.com/</loc> and one <loc> per page in lib/sitePages.ts

   curl -sI https://example.com/ | grep -i x-robots-tag
   # expect: NO output (no X-Robots-Tag on pages)

   curl -s https://example.com/ | grep -oE '<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>'
   # expect: content="index, follow" and href="https://example.com"

   curl -sI https://www.example.com/ | grep -iE "^HTTP|^location"
   # expect: a 301/308 redirect to https://example.com/
   ```
   Also open `https://example.com/terms` → view source → canonical `https://example.com/terms`.
4. **Check the old temporary URL**: it still says `noindex` in `robots.txt`. Better: make the
   host redirect it to the domain, if it offers that.
5. **Google Search Console** (free): Add property → **Domain** → `example.com` → add the TXT
   record it gives you at your domain registrar → Verify → **Sitemaps** → submit `sitemap.xml`.
   Then **URL inspection** → `https://example.com/` → *Request indexing*.
6. **Bing Webmaster Tools** (free): sign in → *Import from Google Search Console* (fastest), or
   add the site and verify by DNS → submit `https://example.com/sitemap.xml`.
7. **Validate the extras:** paste the URL into https://search.google.com/test/rich-results
   (expects a WebApplication item) and into a share-preview checker (or just send the link in
   WhatsApp/Telegram to yourself).
8. **Emergency stop:** set `ALLOW_INDEXING=false` and redeploy. Everything flips back to
   `noindex` / `Disallow: /`. (Pages already indexed drop out over days to weeks.)

## Baseline (Step 1, 2026-11-20)

Lighthouse 12.8.2, mobile, production build (`next start`) on this machine:

| Page / setting | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/`, no `SITE_URL` (noindex) | 92 | 100 | 100 | 63 |
| `/terms`, no `SITE_URL` (noindex) | 98 | 100 | 100 | 63 |
| `/`, `SITE_URL=https://example.com` | 97 | 100 | 100 | 100 |
| `/terms`, `SITE_URL=https://example.com` | 98 | 100 | 100 | 100 |

SEO 63 is intended: the only failing audit is "page is blocked from indexing". CLS is 0.
Local numbers; the live site's numbers will differ (network, region). Re-measure in Step 6.

Re-run yourself: Chrome → open the page → DevTools (F12) → **Lighthouse** tab → Mode
*Navigation*, Device **Mobile**, all 4 categories → **Analyze page load**. Use an Incognito
window (extensions skew the result).
