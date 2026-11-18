/**
 * Tests the code-collision paths of createTextClip against the REAL database.
 * Run:  npm run test:collisions
 *
 * Every row this script creates is tagged "[collision-test]" and deleted at the end,
 * even if a test fails. Codes are picked at random and checked to be unused first,
 * so real clips are never touched.
 */
import { CodeGenerationError, createTextClip, generateCode } from "@/lib/clips";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ClipRow } from "@/types/clip";

const TAG = "[collision-test]";
const createdCodes = new Set<string>();
let failures = 0;

function check(ok: boolean, label: string) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
}

/** A random code with no row at all (live or expired). */
async function freeCode(exclude: string[] = []): Promise<string> {
  for (;;) {
    const code = generateCode();
    if (exclude.includes(code)) continue;
    const { data, error } = await supabaseAdmin.from("clips").select("id").eq("code", code);
    if (error) throw error;
    if (data.length === 0) return code;
  }
}

async function insertRow(code: string, expired: boolean, label: string): Promise<ClipRow> {
  const now = Date.now();
  const { data, error } = await supabaseAdmin
    .from("clips")
    .insert({
      code,
      text_content: `${TAG} ${label}`,
      created_at: new Date(now - 2 * 3600_000).toISOString(),
      expires_at: new Date(expired ? now - 3600_000 : now + 3600_000).toISOString(),
    })
    .select("*")
    .single<ClipRow>();
  if (error) throw error;
  createdCodes.add(code);
  return data;
}

async function rowsFor(code: string): Promise<ClipRow[]> {
  const { data, error } = await supabaseAdmin.from("clips").select("*").eq("code", code);
  if (error) throw error;
  return data as ClipRow[];
}

/** Generator that returns the given codes in order, then repeats the last one. */
function sequence(...codes: string[]) {
  let i = 0;
  const calls: string[] = [];
  const fn = () => {
    const c = codes[Math.min(i++, codes.length - 1)];
    calls.push(c);
    return c;
  };
  return Object.assign(fn, { calls });
}

async function testExpiredCollision() {
  console.log("\n(a) Code held by an EXPIRED clip");
  const expiredCode = await freeCode();
  const otherLiveCode = await freeCode([expiredCode]);

  const oldRow = await insertRow(expiredCode, true, "old expired");
  const otherLive = await insertRow(otherLiveCode, false, "other live (must survive)");

  const gen = sequence(expiredCode);
  const result = await createTextClip(`${TAG} new clip reusing expired code`, { generateCode: gen });
  createdCodes.add(result.code);

  check(result.code === expiredCode, `new clip got the expired clip's code (${expiredCode})`);
  check(gen.calls.length === 1, "no retry was needed");

  const rows = await rowsFor(expiredCode);
  check(rows.length === 1, "exactly one row has that code");
  check(rows[0]?.id !== oldRow.id, "the old expired row is gone (different id)");
  check(rows[0]?.text_content?.includes("new clip") ?? false, "the row holds the new text");
  check(new Date(rows[0]?.expires_at ?? 0) > new Date(), "the new row is live");

  const other = await rowsFor(otherLiveCode);
  check(
    other.length === 1 && other[0].id === otherLive.id && other[0].text_content === otherLive.text_content,
    `the unrelated live clip (${otherLiveCode}) is untouched`,
  );
}

async function testLiveCollision() {
  console.log("\n(b) Code held by a LIVE clip");
  const liveCode = await freeCode();
  const fallbackCode = await freeCode([liveCode]);

  const live = await insertRow(liveCode, false, "live (must survive)");

  const gen = sequence(liveCode, fallbackCode);
  const result = await createTextClip(`${TAG} new clip after retry`, { generateCode: gen });
  createdCodes.add(result.code);

  check(result.code === fallbackCode, `create retried and used the next code (${fallbackCode})`);
  check(gen.calls.length === 2, "generator was called twice (1 collision + 1 success)");

  const rows = await rowsFor(liveCode);
  check(
    rows.length === 1 &&
      rows[0].id === live.id &&
      rows[0].text_content === live.text_content &&
      rows[0].expires_at === live.expires_at,
    `the live clip (${liveCode}) is untouched`,
  );
}

async function testExhaustion() {
  console.log("\n(c) Code always taken by a LIVE clip");
  const liveCode = await freeCode();
  await insertRow(liveCode, false, "live, always collides");

  const gen = sequence(liveCode);
  let threw: unknown = null;
  try {
    const r = await createTextClip(`${TAG} should never be created`, { generateCode: gen });
    createdCodes.add(r.code);
  } catch (err) {
    threw = err;
  }
  check(threw instanceof CodeGenerationError, "throws CodeGenerationError (the API turns this into 503)");
  check(gen.calls.length === 5, `gave up after 5 attempts (made ${gen.calls.length})`);
}

async function cleanUp() {
  const codes = [...createdCodes];
  if (codes.length === 0) return;
  const { error } = await supabaseAdmin.from("clips").delete().in("code", codes).like("text_content", `${TAG}%`);
  console.log(`\nCleanup: removed test rows for ${codes.length} code(s)${error ? ` — ERROR: ${error.message}` : ""}`);
}

async function main() {
  try {
    await testExpiredCollision();
    await testLiveCollision();
    await testExhaustion();
  } catch (err) {
    failures++;
    console.error("\nUnexpected error:", err);
  } finally {
    await cleanUp();
  }
  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
