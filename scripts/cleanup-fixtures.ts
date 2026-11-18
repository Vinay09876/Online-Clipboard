/**
 * Test fixtures for POST /api/cron/cleanup, against the REAL database + bucket.
 *
 *   npm run fixtures:cleanup -- seed     create 2 expired clips (1 with a real file) + 1 live clip
 *   (call the cleanup endpoint)
 *   npm run fixtures:cleanup -- verify   check expired rows + file are gone, live clip survived;
 *                                        then removes the live fixture
 *
 * State between the two commands is kept in scripts/.cleanup-fixtures.json (git-ignored).
 * Only rows tagged "[cleanup-test]" and files under test-fixtures/ are ever touched.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { STORAGE_BUCKET, generateCode } from "@/lib/clips";
import { supabaseAdmin } from "@/lib/supabase/admin";

const TAG = "[cleanup-test]";
const FOLDER = "test-fixtures";
const STATE_FILE = "scripts/.cleanup-fixtures.json";

type State = {
  expiredWithFile: { code: string; filePath: string };
  expiredTextOnly: { code: string };
  live: { code: string };
};

async function freeCode(exclude: string[]): Promise<string> {
  for (;;) {
    const code = generateCode();
    if (exclude.includes(code)) continue;
    const { data, error } = await supabaseAdmin.from("clips").select("id").eq("code", code);
    if (error) throw error;
    if (data.length === 0) return code;
  }
}

async function fileExists(path: string): Promise<boolean> {
  const name = path.slice(FOLDER.length + 1);
  const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list(FOLDER, { search: name });
  if (error) throw error;
  return data.some((f) => f.name === name);
}

async function rowExists(code: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("clips")
    .select("id")
    .eq("code", code)
    .like("text_content", `${TAG}%`);
  if (error) throw error;
  return data.length > 0;
}

async function seed() {
  if (existsSync(STATE_FILE)) {
    throw new Error(`${STATE_FILE} exists. Run "verify" first (or delete the file).`);
  }

  const now = Date.now();
  const past = { created_at: new Date(now - 2 * 3600_000).toISOString(), expires_at: new Date(now - 3600_000).toISOString() };
  const future = { expires_at: new Date(now + 3600_000).toISOString() };

  const c1 = await freeCode([]);
  const c2 = await freeCode([c1]);
  const c3 = await freeCode([c1, c2]);

  // 1. Real file in the bucket.
  const filePath = `${FOLDER}/cleanup-${randomUUID()}.txt`;
  const content = Buffer.from(`cleanup test file created ${new Date().toISOString()}\n`);
  const up = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, content, { contentType: "text/plain" });
  if (up.error) throw up.error;

  // 2. Rows.
  const { error } = await supabaseAdmin.from("clips").insert([
    { code: c1, text_content: `${TAG} expired with file`, file_path: filePath, file_name: "cleanup-test.txt", file_size: content.length, ...past },
    { code: c2, text_content: `${TAG} expired text only`, ...past },
    { code: c3, text_content: `${TAG} live, must survive`, ...future },
  ], { defaultToNull: false }); // multi-row insert: let missing columns (created_at) use their DB default
  if (error) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([filePath]);
    throw error;
  }

  const state: State = { expiredWithFile: { code: c1, filePath }, expiredTextOnly: { code: c2 }, live: { code: c3 } };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

  console.log("Seeded:");
  console.log(`  expired + file  code ${c1}  file ${filePath}  (file in bucket: ${await fileExists(filePath)})`);
  console.log(`  expired, text   code ${c2}`);
  console.log(`  live            code ${c3}`);
  console.log('\nNow call the cleanup endpoint, then run:  npm run fixtures:cleanup -- verify');
}

async function verify() {
  if (!existsSync(STATE_FILE)) throw new Error(`${STATE_FILE} not found. Run "seed" first.`);
  const s = JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
  let failures = 0;
  const check = (ok: boolean, label: string) => {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) failures++;
  };

  check(!(await rowExists(s.expiredWithFile.code)), `expired clip with file (${s.expiredWithFile.code}) row deleted`);
  check(!(await fileExists(s.expiredWithFile.filePath)), `its storage file deleted (${s.expiredWithFile.filePath})`);
  check(!(await rowExists(s.expiredTextOnly.code)), `expired text-only clip (${s.expiredTextOnly.code}) deleted`);
  check(await rowExists(s.live.code), `live clip (${s.live.code}) survived`);

  // Tidy up everything this script created, whatever the outcome.
  await supabaseAdmin.from("clips").delete()
    .in("code", [s.expiredWithFile.code, s.expiredTextOnly.code, s.live.code])
    .like("text_content", `${TAG}%`);
  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([s.expiredWithFile.filePath]);
  rmSync(STATE_FILE);
  console.log("\nRemoved all fixtures.");

  console.log(failures === 0 ? "ALL PASSED" : `${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

const cmd = process.argv[2];
(cmd === "seed" ? seed() : cmd === "verify" ? verify() : Promise.reject(new Error('Usage: seed | verify')))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
