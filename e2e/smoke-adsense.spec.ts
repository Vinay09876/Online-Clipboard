import { buildCsp } from "../proxy";
import { evaluateAds, type AdsPage, type AdsTxtResponse } from "../scripts/smoke-ads";
import { expect, test } from "./helpers";

/**
 * Unit tests for the ads part of the production smoke test (scripts/smoke-ads.ts).
 * No server involved: every state and mismatch is fed in directly.
 */

const DIGITS = "1234567890123456";
const LINE = `google.com, pub-${DIGITS}, DIRECT, f08c47fec0942fa0`;
const CSP_OFF = buildCsp("abc", false, false); // the real production CSP with ads off
const CSP_ADS = buildCsp("abc", false, true); // the real CSP of an ad page with ads active

const meta = (id: string) => `<meta name="google-adsense-account" content="${id}"/>`;
const page = (label: string, extra = "", csp = CSP_OFF): AdsPage => ({ label, html: `<html><head>${extra}</head><body></body></html>`, csp });
const ok200 = (text = `${LINE}\n`): AdsTxtResponse => ({ status: 200, text });
const notFound: AdsTxtResponse = { status: 404, text: "Not Found" };

const failed = (r: ReturnType<typeof evaluateAds>) => r.checks.filter((c) => !c.ok).map((c) => c.label);

test.describe("smoke test ads states", () => {
  test("not configured: 404 + no meta + no ad code passes", () => {
    const r = evaluateAds(notFound, [page("/"), page("guide")], null);
    expect(r.state).toBe("not configured");
    expect(failed(r)).toEqual([]);
    expect(r.info.join(" ")).toContain("not configured");
  });

  test("not configured but a meta tag is present: fails", () => {
    const r = evaluateAds(notFound, [page("/", meta(`ca-pub-${DIGITS}`)), page("guide")], null);
    expect(failed(r)).toEqual(["/: no google-adsense-account meta tag"]);
  });

  test("review state: one line + same ID in the meta tag on every page + no ad code passes, and says so", () => {
    const r = evaluateAds(ok200(), [page("/", meta(`ca-pub-${DIGITS}`)), page("guide", meta(`ca-pub-${DIGITS}`))], null);
    expect(r.state).toBe("AdSense review");
    expect(failed(r)).toEqual([]);
    expect(r.info.join(" ")).toContain("AdSense review");
    expect(r.info.join(" ")).toContain("bare-domain ads.txt check skipped");
  });

  test("review state: the line without a trailing newline also passes; CRLF ending too", () => {
    const pages = [page("/", meta(`ca-pub-${DIGITS}`))];
    expect(failed(evaluateAds(ok200(LINE), pages, null))).toEqual([]);
    expect(failed(evaluateAds(ok200(`${LINE}\r\n`), pages, null))).toEqual([]);
  });

  for (const [name, body] of [
    ["two lines", `${LINE}\n${LINE}\n`],
    ["comment line", `# ads\n${LINE}\n`],
    ["15 digits", LINE.replace(DIGITS, DIGITS.slice(1))],
    ["ca- prefix kept", LINE.replace("pub-", "ca-pub-")],
    ["RESELLER", LINE.replace("DIRECT", "RESELLER")],
    ["wrong certification ID", LINE.replace("f08c47fec0942fa0", "f08c47fec0942fa1")],
    ["extra spaces", LINE.replace(", ", ",  ")],
    ["empty", ""],
  ] as const) {
    test(`review state: malformed ads.txt (${name}) fails`, () => {
      const r = evaluateAds(ok200(body), [page("/", meta(`ca-pub-${DIGITS}`))], null);
      expect(failed(r)).toContain('/ads.txt is exactly one line "google.com, pub-<16 digits>, DIRECT, f08c47fec0942fa0"');
    });
  }

  test("review state: different publisher ID in the meta tag fails", () => {
    const r = evaluateAds(ok200(), [page("/", meta("ca-pub-9999999999999999")), page("guide", meta(`ca-pub-${DIGITS}`))], null);
    expect(failed(r)).toEqual(["/: exactly one google-adsense-account meta tag with the same publisher ID as /ads.txt (ca-pub-<same digits>)"]);
  });

  test("review state: meta tag missing on a page, or present twice, fails", () => {
    expect(failed(evaluateAds(ok200(), [page("/", meta(`ca-pub-${DIGITS}`)), page("guide")], null))).toHaveLength(1);
    const twice = meta(`ca-pub-${DIGITS}`).repeat(2);
    expect(failed(evaluateAds(ok200(), [page("/", twice)], null))).toHaveLength(1);
  });

  test("review state: ad code present fails (script, ad domain in CSP, ad-page CSP relaxations)", () => {
    const m = meta(`ca-pub-${DIGITS}`);
    const script = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${DIGITS}"></script>`;
    expect(failed(evaluateAds(ok200(), [page("/", m + script)], null))).toEqual(["/: no adsbygoogle script (ads are off)"]);
    expect(failed(evaluateAds(ok200(), [page("/", m, `${CSP_OFF}; frame-src https://googleads.g.doubleclick.net`)], null))).toEqual([
      "/: CSP has no ad domains",
    ]);
    expect(failed(evaluateAds(ok200(), [page("/", m, CSP_ADS)], null))).toEqual([
      "/: CSP has none of the ad-page relaxations ('unsafe-eval' in script-src, https: in frame-src)",
    ]);
  });

  test("the same ad-code checks apply in the not-configured state", () => {
    expect(failed(evaluateAds(notFound, [page("/", "", CSP_ADS)], null))).toHaveLength(1);
    expect(failed(evaluateAds(notFound, [page("/", '<script src="x/adsbygoogle.js"></script>')], null))).toHaveLength(1);
  });

  test("today's production CSP (ads off) has no 'unsafe-eval' and no frame-src, so the relaxation check can't false-fail", () => {
    expect(CSP_OFF).not.toContain("'unsafe-eval'");
    expect(CSP_OFF).not.toMatch(/frame-src/);
    // ...and it does catch the real ad CSP.
    expect(CSP_ADS).toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(CSP_ADS).toMatch(/frame-src https:/);
  });

  test("ads.txt neither 404 nor 200 (e.g. a redirect) fails", () => {
    const r = evaluateAds({ status: 301, text: "", location: "https://elsewhere.example/ads.txt" }, [page("/")], null);
    expect(r.state).toBe("unexpected");
    expect(failed(r)).toEqual(["/ads.txt -> 404 (not configured) or 200 (AdSense review)"]);
  });

  test("--ads-txt-origin: same line with 200 passes; redirect, 404, different line or no answer fails", () => {
    const pages = [page("/", meta(`ca-pub-${DIGITS}`))];
    const apex = (res: AdsTxtResponse) => ({ origin: "https://example.com", res });
    const label = "https://example.com/ads.txt -> 200 (not a redirect) with exactly the same line as the site";

    const good = evaluateAds(ok200(), pages, apex(ok200(LINE)));
    expect(failed(good)).toEqual([]);
    expect(good.info.join(" ")).not.toContain("skipped");

    for (const res of [
      { status: 301, text: "", location: "https://online-clipboard.example.com/ads.txt" },
      { status: 308, text: "", location: "https://online-clipboard.example.com/ads.txt" },
      notFound,
      ok200(LINE.replace(DIGITS, "6543210987654321")),
      ok200(`${LINE}\n${LINE}`),
      { status: 0, text: "TypeError: fetch failed" },
    ]) {
      expect(failed(evaluateAds(ok200(), pages, apex(res))), JSON.stringify(res)).toEqual([label]);
    }
  });

  test("--ads-txt-origin in the not-configured state: not checked, says so", () => {
    const r = evaluateAds(notFound, [page("/")], { origin: "https://example.com", res: notFound });
    expect(failed(r)).toEqual([]);
    expect(r.info.join(" ")).toContain("only applies in the AdSense review state");
  });
});
