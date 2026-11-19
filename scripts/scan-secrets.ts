/**
 * Scans the WHOLE git history (every commit on every branch, plus staged files) for secrets.
 *
 *   npm run scan:secrets
 *
 * 1. Exact values: every secret-looking value in .env.local (service key, CRON_SECRET,
 *    IP_HASH_SALT, ...) is searched for literally.
 * 2. Patterns: Supabase secret keys, JWTs (old-style service_role keys), private keys,
 *    and any committed .env file other than .env.example.
 *
 * Prints only WHERE something was found (commit + file), never the secret itself.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * Known fake values used on purpose in tests (e.g. an invalid key to simulate an outage).
 * Exact strings only; anything else that matches a pattern is reported.
 */
const ALLOWLIST = new Set(["sb_secret_this_key_is_not_valid_0000000000"]);

const git = (args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

/** git grep exits 1 when nothing matches; treat that as "no hits". */
function gitGrep(args: string[]): string[] {
  try {
    return git(["grep", ...args]).split("\n").filter(Boolean);
  } catch (err) {
    if ((err as { status?: number }).status === 1) return [];
    throw err;
  }
}

const revs = git(["rev-list", "--all"]).split("\n").filter(Boolean);
console.log(`Scanning ${revs.length} commit(s) + the staging area.\n`);

let findings = 0;
/** `where` entries are "<commit>:<path>" or "STAGED:<path>"; never the matched text. */
function report(label: string, where: string[]) {
  const unique = [...new Set(where)];
  if (unique.length === 0) {
    console.log(`  ok    ${label}`);
    return;
  }
  findings += unique.length;
  console.log(`  FOUND ${label}`);
  for (const w of unique.slice(0, 20)) console.log(`          ${w}`);
  if (unique.length > 20) console.log(`          … and ${unique.length - 20} more`);
}

/**
 * Runs `git grep -o -E/-F <pattern>` over all commits (in batches, for Windows command-line
 * limits) and the index. Output lines are "<rev>:<path>:<match>" (or "<path>:<match>" for
 * the index); allowlisted matches are dropped and only the location is kept.
 */
function search(label: string, mode: "-E" | "-F", pattern: string) {
  const where: string[] = [];
  for (let i = 0; i < revs.length; i += 50) {
    for (const line of gitGrep(["-o", mode, "-e", pattern, ...revs.slice(i, i + 50)])) {
      const [rev, path, ...rest] = line.split(":");
      if (!ALLOWLIST.has(rest.join(":"))) where.push(`${rev}:${path}`);
    }
  }
  for (const line of gitGrep(["--cached", "-o", mode, "-e", pattern])) {
    const [path, ...rest] = line.split(":");
    if (!ALLOWLIST.has(rest.join(":"))) where.push(`STAGED:${path}`);
  }
  report(label, where);
}

// 1. Exact values from .env.local -------------------------------------------
console.log("1) Values from .env.local");
if (!existsSync(".env.local")) {
  console.log("  (no .env.local found; skipping)");
} else {
  const SECRET_NAMES = /KEY|SECRET|SALT|TOKEN|PASSWORD/i;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || !SECRET_NAMES.test(m[1])) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (value.length < 12) continue; // too short to search meaningfully
    search(`${m[1]} (value from .env.local)`, "-F", value);
  }
}

// 2. Patterns ------------------------------------------------------------------
console.log("\n2) Patterns");
search("Supabase secret key (sb_secret_…)", "-E", "sb_secret_[A-Za-z0-9_-]{10,}");
search("JWT (e.g. legacy service_role key)", "-E", "eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}");
search("private key block", "-F", "-----BEGIN");

const envFiles = git(["log", "--all", "--pretty=format:%h", "--name-only", "--diff-filter=A"])
  .split("\n")
  .filter((p) => /(^|\/)\.env(\..+)?$/.test(p) && !p.endsWith(".env.example"));
report("committed .env files (other than .env.example)", envFiles.map((p) => `history:${p}`));

console.log(
  findings === 0
    ? "\nNo secrets found in git history."
    : `\n${findings} location(s) found. Rotate those secrets NOW, then clean history (see docs/deploy.md, "If a secret was committed").`,
);
process.exit(findings === 0 ? 0 : 1);
