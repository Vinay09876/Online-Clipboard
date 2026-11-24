/**
 * The ads part of the production smoke test (scripts/smoke-prod.ts), kept free of network code
 * so every case can be unit-tested (e2e/smoke-adsense.spec.ts).
 *
 * Two legitimate states while ads are OFF (ADS_ENABLED unset/false):
 *   "not configured"  ADSENSE_CLIENT_ID unset: /ads.txt 404, no google-adsense-account meta tag.
 *   "AdSense review"  ADSENSE_CLIENT_ID set (docs/ads-plan.md §5 step 3): /ads.txt 200 with the one
 *                     line, the meta tag on pages with the SAME publisher ID.
 * In BOTH states there must be no ad code: no adsbygoogle script, no ad domains in the CSP, and
 * none of the CSP relaxations that only ad pages get while ads are active ('unsafe-eval' in
 * script-src, a scheme-only https: in frame-src; see buildCsp in proxy.ts).
 * Anything else (other status, wrong format, different IDs, meta without ads.txt or the reverse)
 * fails.
 */

/** The official AdSense ads.txt line (docs/ads-plan.md §4), publisher digits captured. */
export const ADS_TXT_LINE_RE = /^google\.com, pub-(\d{16}), DIRECT, f08c47fec0942fa0$/;

const AD_DOMAINS_RE = /google|doubleclick|adservice|fundingchoices/i;

export type AdsPage = { label: string; html: string; csp: string };
export type AdsTxtResponse = { status: number; text: string; location?: string | null };
export type AdsCheck = { ok: boolean; label: string; detail?: unknown };
export type AdsSmokeResult = { state: "not configured" | "AdSense review" | "unexpected"; info: string[]; checks: AdsCheck[] };

/** The single line of an ads.txt body, or null if it isn't exactly one line (one trailing newline allowed). */
export function singleLine(body: string): string | null {
  const b = body.replace(/\r?\n$/, "");
  return /[\r\n]/.test(b) ? null : b;
}

/** Contents of every <meta name="google-adsense-account"> tag (attribute order doesn't matter). */
export function adsenseMetaContents(html: string): string[] {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map((m) => m[0])
    .filter((t) => /\bname=["']google-adsense-account["']/i.test(t))
    .map((t) => /\bcontent=["']([^"']*)["']/i.exec(t)?.[1] ?? "");
}

/** Sources of one CSP directive (empty when the directive is absent). */
export function cspDirective(csp: string, name: string): string[] {
  const d = csp
    .split(";")
    .map((s) => s.trim().split(/\s+/))
    .find((parts) => parts[0]?.toLowerCase() === name);
  return d ? d.slice(1) : [];
}

function noAdCode(pages: AdsPage[]): AdsCheck[] {
  const checks: AdsCheck[] = [];
  for (const p of pages) {
    checks.push({ ok: !/adsbygoogle/.test(p.html), label: `${p.label}: no adsbygoogle script (ads are off)` });
    checks.push({ ok: !AD_DOMAINS_RE.test(p.csp), label: `${p.label}: CSP has no ad domains`, detail: p.csp });
    const scriptSrc = cspDirective(p.csp, "script-src");
    const frameSrc = cspDirective(p.csp, "frame-src");
    checks.push({
      ok: !scriptSrc.includes("'unsafe-eval'") && !frameSrc.includes("https:"),
      label: `${p.label}: CSP has none of the ad-page relaxations ('unsafe-eval' in script-src, https: in frame-src)`,
      detail: { scriptSrc, frameSrc },
    });
  }
  return checks;
}

/**
 * @param adsTxt     GET /ads.txt on the site being tested (redirects not followed)
 * @param pages      pages to inspect (the smoke test passes the home page and a guide)
 * @param apex       --ads-txt-origin: its /ads.txt (redirects not followed), or null when the flag wasn't given
 */
export function evaluateAds(
  adsTxt: AdsTxtResponse,
  pages: AdsPage[],
  apex: { origin: string; res: AdsTxtResponse } | null,
): AdsSmokeResult {
  const info: string[] = [];
  const checks: AdsCheck[] = [];
  const metas = pages.map((p) => ({ label: p.label, contents: adsenseMetaContents(p.html) }));

  if (adsTxt.status === 404) {
    info.push("ads state: not configured (/ads.txt is 404): expecting no AdSense meta tag and no ad code");
    for (const m of metas) {
      checks.push({ ok: m.contents.length === 0, label: `${m.label}: no google-adsense-account meta tag`, detail: m.contents });
    }
    checks.push(...noAdCode(pages));
    if (apex) info.push(`--ads-txt-origin ${apex.origin} not checked: it only applies in the AdSense review state`);
    return { state: "not configured", info, checks };
  }

  if (adsTxt.status === 200) {
    info.push("ads state: AdSense review (/ads.txt is 200, ads off): expecting ads.txt + matching meta tag, still no ad code");
    const line = singleLine(adsTxt.text);
    const digits = line === null ? null : (ADS_TXT_LINE_RE.exec(line)?.[1] ?? null);
    checks.push({
      ok: digits !== null,
      label: '/ads.txt is exactly one line "google.com, pub-<16 digits>, DIRECT, f08c47fec0942fa0"',
      detail: adsTxt.text,
    });
    for (const m of metas) {
      checks.push({
        ok: digits !== null && m.contents.length === 1 && m.contents[0] === `ca-pub-${digits}`,
        label: `${m.label}: exactly one google-adsense-account meta tag with the same publisher ID as /ads.txt (ca-pub-<same digits>)`,
        detail: { adsTxtDigits: digits, meta: m.contents },
      });
    }
    checks.push(...noAdCode(pages));
    if (apex) {
      const apexLine = apex.res.status === 200 ? singleLine(apex.res.text) : null;
      checks.push({
        ok: apex.res.status === 200 && digits !== null && apexLine === line,
        label: `${apex.origin}/ads.txt -> 200 (not a redirect) with exactly the same line as the site`,
        detail: { status: apex.res.status, location: apex.res.location ?? undefined, body: apex.res.text.slice(0, 200) },
      });
    } else {
      info.push("bare-domain ads.txt check skipped (pass --ads-txt-origin https://<root domain> to check it)");
    }
    return { state: "AdSense review", info, checks };
  }

  checks.push({ ok: false, label: "/ads.txt -> 404 (not configured) or 200 (AdSense review)", detail: { status: adsTxt.status, location: adsTxt.location } });
  checks.push(...noAdCode(pages));
  return { state: "unexpected", info, checks };
}
