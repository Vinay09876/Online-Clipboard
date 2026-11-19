/**
 * Step 8 egress-guard tests against the REAL database + bucket.
 *
 *   npm run test:egress               builds the app (~1 min), then runs
 *   npm run test:egress -- --no-build reuse the last build
 *
 * Starts its own production server (port 3240) with MAX_MONTHLY_DOWNLOAD_MB set just
 * above this month's real usage, so one download fits and the next one doesn't.
 * Afterwards exactly the bytes this test added are subtracted from this month's counter
 * (real downloads made meanwhile stay counted) and every test clip/file is deleted.
 */
import { randomBytes } from "node:crypto";
import { STORAGE_BUCKET } from "@/lib/clips";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { build, startServer, stopAllServers } from "./testServer";

const MB = 1024 * 1024;
const createdCodes = new Set<string>();
let failures = 0;

function check(ok: boolean, label: string, detail?: unknown) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail !== undefined ? `  -> ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  if (!ok) failures++;
}

const ip = () => `198.18.${randomBytes(1)[0]}.${1 + (randomBytes(1)[0] % 254)}`;
const monthKey = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

async function monthBytes(): Promise<number | null> {
  const { data, error } = await supabaseAdmin.from("download_usage").select("bytes").eq("month", monthKey()).maybeSingle();
  if (error) throw new Error(`download_usage read failed: ${error.message}. Did you run db/004_usage.sql?`);
  return data ? Number(data.bytes) : null;
}

async function api(base: string, method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "X-Forwarded-For": ip(), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  if (typeof json.code === "string") createdCodes.add(json.code);
  return { status: res.status, text, json, headers: res.headers };
}

async function main() {
  if (!process.argv.includes("--no-build") && !build()) process.exit(1);

  const startRow = await monthBytes(); // null = no row yet this month
  const start = startRow ?? 0;
  const capMb = Math.floor(start / MB) + 2; // room between 1 and 2 MB
  const room = capMb * MB - start;
  const size = Math.floor(room * 0.6); // one fits, two don't
  console.log(`This month so far: ${start} bytes. Test limit: ${capMb} MB (room ${room} bytes). Test file: ${size} bytes.`);
  /** Bytes this test added to the real counter; exactly this is subtracted afterwards. */
  let testAdded = 0;

  try {
    const base = await startServer(3240, { MAX_MONTHLY_DOWNLOAD_MB: String(capMb), MAX_LIVE_CLIPS: "1000000", MAX_TOTAL_STORAGE_MB: "1000000" });

    console.log("\n1) Set-up: a ready file clip");
    const created = await api(base, "POST", "/api/clips", { file: { name: "egress.bin", size } });
    check(created.status === 201, "file clip created", created.status);
    const code = created.json.code as string;
    const upload = created.json.upload as { signedUrl: string };
    const put = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(randomBytes(size)) });
    check(put.status === 200, "uploaded", put.status);
    const done = await api(base, "POST", `/api/clips/${code}/complete`);
    check(done.status === 200, "completed", done.status);

    console.log("\n2) First download fits the budget");
    const d1 = await api(base, "GET", `/api/clips/${code}/download`);
    if (d1.status === 200) testAdded += size;
    check(d1.status === 200 && typeof d1.json.url === "string", "download #1 -> 200 with a signed URL", d1.status);
    const after1 = (await monthBytes()) ?? 0;
    check(after1 === start + size, `counter grew by exactly the file size (+${size})`, { start, after1 });

    console.log("\n3) Second download would exceed it");
    const d2 = await api(base, "GET", `/api/clips/${code}/download`);
    check(d2.status === 503, "download #2 -> 503", d2.status);
    check(
      d2.json.error === "Downloads are paused until next month." && d2.json.reason === "downloads_paused" && Object.keys(d2.json).length === 2,
      "generic body { error, reason: 'downloads_paused' } (no internals)",
      d2.json,
    );
    check((d2.headers.get("cache-control") ?? "").includes("no-store"), "503 is no-store");
    const after2 = (await monthBytes()) ?? 0;
    check(after2 === after1, "a refused download does not add to the counter", { after1, after2 });

    console.log("\n4) Everything else keeps working");
    const meta = await api(base, "GET", `/api/clips/${code}`);
    check(meta.status === 200 && meta.json.fileName === "egress.bin", "clip metadata still 200");
    const text = await api(base, "POST", "/api/clips", { text: "text still works" });
    check(text.status === 201, "text clip create still 201", text.status);
    const fetched = await api(base, "GET", `/api/clips/${text.json.code}`);
    check(fetched.status === 200 && fetched.json.text === "text still works", "text clip fetch still 200");
    const wrong = await api(base, "GET", `/api/clips/000000/download`);
    check(wrong.status === 404 || wrong.status === 503, "unknown code on /download is still 404 (not 503)", wrong.status);
  } catch (err) {
    failures++;
    console.error("  FAIL  threw:", err);
  } finally {
    stopAllServers();

    // Take back exactly what this test added. (Not "reset to the starting value": on a live
    // site, real downloads made while the test ran must stay counted.)
    const now = (await monthBytes()) ?? 0;
    const back = Math.max(0, now - testAdded);
    if (startRow === null && back === 0) await supabaseAdmin.from("download_usage").delete().eq("month", monthKey());
    else await supabaseAdmin.from("download_usage").update({ bytes: back }).eq("month", monthKey());
    console.log(`\nCounter: removed this test's ${testAdded} bytes (${now} -> ${back}; was ${startRow ?? "no row"} at start).`);

    const codes = [...createdCodes];
    if (codes.length) {
      const { data } = await supabaseAdmin.from("clips").select("id, file_path").in("code", codes);
      const keys = (data ?? []).flatMap((r) => [r.id, r.file_path]).filter(Boolean) as string[];
      if (keys.length) await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([...new Set(keys)]);
      await supabaseAdmin.from("clips").delete().in("code", codes);
    }
    console.log(`Removed ${codes.length} test clip(s).`);
  }

  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
