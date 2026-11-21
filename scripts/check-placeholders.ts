/**
 * Placeholder guard: an unfinished page must never go live on a real domain.
 *
 * Runs automatically before every `npm run build` (the "prebuild" script). When the site is
 * INDEXABLE (SITE_URL is a real https domain and ALLOW_INDEXING isn't "false", see
 * lib/site.ts), the build FAILS if:
 *   - any "[[ADD: …]]" placeholder remains in shipped source (app, components, content, lib), or
 *   - no contact email is configured (CONTACT_EMAIL or ABUSE_CONTACT_EMAIL).
 * On temporary hosts (*.vercel.app, *.netlify.app, localhost) it only reports, and passes.
 *
 *   npm run check:placeholders                 uses the current env (+ .env.local, if present)
 *   tsx scripts/check-placeholders.ts --dir X  scan another folder (used by the tests)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Local runs: pick up .env.local like Next.js does (never overrides real env vars).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const MARKER = "[[" + "ADD:"; // built from parts so this file doesn't match itself
const SCAN_DIRS = ["app", "components", "content", "lib"];
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|md|mdx|json)$/;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTENSIONS.test(name)) out.push(p);
  }
  return out;
}

async function main() {
  const dirArg = process.argv.indexOf("--dir");
  const dirs = dirArg >= 0 ? [process.argv[dirArg + 1]] : SCAN_DIRS;

  // Imported after loading .env.local, because lib/site.ts reads env at import time.
  const { INDEXABLE, INDEXING_OFF_REASON } = await import("../lib/site");

  const found: string[] = [];
  for (const file of dirs.flatMap((d) => walk(d))) {
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .forEach((line, i) => {
        let at = line.indexOf(MARKER);
        while (at >= 0) {
          const end = line.indexOf("]]", at);
          found.push(`${relative(".", file)}:${i + 1}  ${line.slice(at, end >= 0 ? end + 2 : at + 80)}`);
          at = line.indexOf(MARKER, at + MARKER.length);
        }
      });
  }

  const contactMissing = !process.env.CONTACT_EMAIL?.trim() && !process.env.ABUSE_CONTACT_EMAIL?.trim();

  console.log(`Placeholder check: ${found.length} placeholder(s) found.`);
  for (const f of found) console.log(`  ${f}`);
  if (contactMissing) console.log("  (no CONTACT_EMAIL or ABUSE_CONTACT_EMAIL set)");

  if (!INDEXABLE) {
    console.log(`Indexing is off (${INDEXING_OFF_REASON}), so this is not blocking.`);
    return;
  }
  if (found.length > 0 || contactMissing) {
    console.error(
      "\nBUILD BLOCKED: the site is indexable (SITE_URL is a real domain), but owner details are missing.\n" +
        "Replace every [[" + "ADD: …]] placeholder above and set CONTACT_EMAIL (or ABUSE_CONTACT_EMAIL),\n" +
        "or set ALLOW_INDEXING=false until the pages are finished.",
    );
    process.exit(1);
  }
  console.log("Indexable and complete: OK.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
