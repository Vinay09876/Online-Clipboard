/**
 * Checks every OUTBOUND link on the public pages (guides' official help pages, legal pages, …).
 * Not part of the normal test run: it talks to many other websites.
 *
 *   npm run check:links                                  against http://localhost:3000
 *   npm run check:links -- https://online-clipboard.vinaycode.com
 *
 * Polite: one request at a time per website, 1.5 s between requests to the same website,
 * a normal browser-like User-Agent, HEAD first and GET only when HEAD isn't allowed.
 * Reports redirects (with the final address) and failures; exits 1 if any link is broken.
 * Some sites (e.g. Apple, Microsoft) refuse automated requests with 403/429: those are
 * listed as "check by hand", not as broken.
 */
import { SITE_PAGES } from "../lib/sitePages";

const base = (process.argv.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000").replace(/\/+$/, "");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36 link-check";
const PER_HOST_DELAY_MS = 1500;
const TIMEOUT_MS = 20_000;

type Result = { url: string; status: number | string; final?: string; pages: string[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchFollow(url: string, method: "HEAD" | "GET"): Promise<{ status: number; final: string }> {
  let current = url;
  for (let hop = 0; hop < 10; hop++) {
    const res = await fetch(current, {
      method,
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.body?.cancel().catch(() => {});
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      continue;
    }
    return { status: res.status, final: current };
  }
  return { status: 310, final: current }; // too many redirects
}

async function main() {
  // 1. Collect outbound links from every public page.
  const links = new Map<string, Set<string>>();
  for (const { path } of SITE_PAGES) {
    const res = await fetch(`${base}${path}`);
    if (!res.ok) {
      console.error(`Could not load ${base}${path} (${res.status}). Is the server running?`);
      process.exit(2);
    }
    const html = await res.text();
    for (const m of html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"/g)) {
      const url = m[1].replace(/&amp;/g, "&");
      if (new URL(url).origin === new URL(base).origin) continue;
      if (!links.has(url)) links.set(url, new Set());
      links.get(url)!.add(path);
    }
  }
  console.log(`Checking ${links.size} outbound link(s) found on ${SITE_PAGES.length} pages of ${base}\n`);

  // 2. Check them, one request at a time per host.
  const byHost = new Map<string, string[]>();
  for (const url of links.keys()) {
    const h = new URL(url).host;
    byHost.set(h, [...(byHost.get(h) ?? []), url]);
  }
  const results: Result[] = [];
  await Promise.all(
    [...byHost.values()].map(async (urls) => {
      for (const url of urls) {
        let r: { status: number | string; final?: string };
        try {
          r = await fetchFollow(url, "HEAD");
          if (r.status === 405 || r.status === 403 || r.status === 404 || r.status === 400) {
            await sleep(PER_HOST_DELAY_MS);
            r = await fetchFollow(url, "GET");
          }
        } catch (e) {
          r = { status: e instanceof Error ? e.name : "error" };
        }
        results.push({ url, ...r, pages: [...links.get(url)!] });
        await sleep(PER_HOST_DELAY_MS);
      }
    }),
  );

  // 3. Report.
  const ok = results.filter((r) => typeof r.status === "number" && r.status < 300 && r.final === r.url);
  const redirected = results.filter((r) => typeof r.status === "number" && r.status < 300 && r.final !== r.url);
  const blocked = results.filter((r) => r.status === 403 || r.status === 429 || r.status === 401);
  const broken = results.filter((r) => !ok.includes(r) && !redirected.includes(r) && !blocked.includes(r));

  console.log(`OK (${ok.length})`);
  for (const r of redirected) console.log(`REDIRECT  ${r.url}\n          → ${r.final}  (on ${r.pages.join(", ")})`);
  for (const r of blocked) console.log(`CHECK BY HAND (${r.status})  ${r.url}  (on ${r.pages.join(", ")})`);
  for (const r of broken) console.log(`BROKEN (${r.status})  ${r.url}  (on ${r.pages.join(", ")})`);
  console.log(
    `\n${ok.length} ok, ${redirected.length} redirected, ${blocked.length} to check by hand, ${broken.length} broken.`,
  );
  process.exit(broken.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
