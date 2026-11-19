/**
 * Step 5 file tests against the REAL database + bucket, through the running app.
 *
 *   1. start the app:   npm run dev            (note the port it prints)
 *   2. run:             npm run test:files -- http://localhost:3001
 *
 * Everything the script creates (rows and objects) is deleted at the end, even on failure.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { STALE_AFTER_MS, sweepOrphanedFiles } from "@/lib/cleanup";
import { STORAGE_BUCKET } from "@/lib/clips";
import { MAX_FILE_SIZE_BYTES } from "@/lib/config";
import { completeFileUpload, sanitizeFileName } from "@/lib/files";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const createdCodes = new Set<string>();
const extraKeys = new Set<string>();
let failures = 0;

function check(ok: boolean, label: string, detail?: unknown) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail !== undefined ? `  -> ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}

type Json = Record<string, unknown>;

async function api(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; json: Json }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Json = {};
  try {
    json = text ? (JSON.parse(text) as Json) : {};
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

type Upload = { signedUrl: string; token: string; path: string };

async function createFileClip(name: string, size: number, text?: string) {
  const r = await api("POST", "/api/clips", { file: { name, size }, ...(text ? { text } : {}) });
  if (typeof r.json.code === "string") createdCodes.add(r.json.code);
  return r as { status: number; json: Json & { code: string; upload: Upload } };
}

/** Exactly what the browser will do: plain PUT, no Supabase key or auth header. */
async function putToSignedUrl(signedUrl: string, bytes: Buffer, contentType = "application/octet-stream") {
  const res = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: new Uint8Array(bytes) });
  return { status: res.status, body: (await res.text()).slice(0, 300) };
}

async function objectExists(key: string): Promise<boolean> {
  const { data } = await supabaseAdmin.storage.from(STORAGE_BUCKET).exists(key);
  return data === true;
}

async function rowByCode(code: string) {
  const { data, error } = await supabaseAdmin.from("clips").select("*").eq("code", code).maybeSingle();
  if (error) throw error;
  return data as { id: string; file_path: string | null; file_name: string | null; file_size: number | null; ready: boolean } | null;
}

// ---------------------------------------------------------------------------

async function test1HappyPath() {
  console.log("\n1) Happy path: create -> upload -> complete -> metadata -> download");
  const name = "report (1) résumé.bin";
  const bytes = randomBytes(300_000);

  const c = await createFileClip(name, bytes.length, "notes that go with the file");
  check(c.status === 201, "create returns 201", c);
  check(!!c.json.upload?.signedUrl && !!c.json.upload?.token && !!c.json.upload?.path, "response has upload { signedUrl, token, path }");

  const put = await putToSignedUrl(c.json.upload.signedUrl, bytes);
  check(put.status === 200, "PUT to signed URL without any Supabase key succeeds", put);

  const done = await api("POST", `/api/clips/${c.json.code}/complete`);
  check(done.status === 200 && done.json.ok === true, "complete returns { ok: true }", done);

  const again = await api("POST", `/api/clips/${c.json.code}/complete`);
  check(again.status === 200, "calling complete again is harmless (200)", again);

  const meta = await api("GET", `/api/clips/${c.json.code}`);
  check(meta.status === 200, "metadata returns 200", meta);
  check(meta.json.fileName === name, "fileName is the original name", meta.json.fileName);
  check(meta.json.fileSize === bytes.length, "fileSize is the real size", meta.json.fileSize);
  check(meta.json.text === "notes that go with the file", "text + file together works");
  check(!("id" in meta.json) && !("filePath" in meta.json) && !("file_path" in meta.json), "no id / file path in response", Object.keys(meta.json));

  const dl = await api("GET", `/api/clips/${c.json.code}/download`);
  check(dl.status === 200 && typeof dl.json.url === "string" && dl.json.expiresIn === 60, "download returns { url, expiresIn: 60 }", dl);

  const file = await fetch(dl.json.url as string);
  const got = Buffer.from(await file.arrayBuffer());
  check(file.status === 200, "signed download URL works without any key", file.status);
  check(got.equals(bytes), `downloaded bytes equal uploaded bytes (${got.length} bytes)`);

  const cd = file.headers.get("content-disposition") ?? "";
  const star = /filename\*=UTF-8''([^;]+)/.exec(cd)?.[1];
  check(cd.startsWith("attachment"), "Content-Disposition is attachment", cd);
  check(!!star && decodeURIComponent(star) === name, "download file name is exactly the original", cd);
}

async function test2NotVisibleBeforeComplete() {
  console.log("\n2) Not visible before complete");
  const c = await createFileClip("pending.txt", 5);
  check((await api("GET", `/api/clips/${c.json.code}`)).status === 404, "metadata is 404 before upload");
  check((await api("GET", `/api/clips/${c.json.code}/download`)).status === 404, "download is 404 before upload");
  await putToSignedUrl(c.json.upload.signedUrl, Buffer.from("hello"), "text/plain");
  const meta = await api("GET", `/api/clips/${c.json.code}`);
  check(meta.status === 404 && meta.json.error === "Clip not found.", "metadata is the same 404 after upload but before complete", meta);
}

async function test3CompleteWithoutUpload() {
  console.log("\n3) Complete without uploading");
  const c = await createFileClip("never-uploaded.txt", 10);
  const r = await api("POST", `/api/clips/${c.json.code}/complete`);
  check(r.status === 409, "complete returns 409", r);
  const row = await rowByCode(c.json.code);
  check(row?.ready === false, "row is still pending (ready = false)");
}

async function test4DeclaredSizeValidation() {
  console.log("\n4) Input validation");
  const cases: Array<[string, unknown]> = [
    ["declared size over the limit", { file: { name: "big.bin", size: MAX_FILE_SIZE_BYTES + 1 } }],
    ["size 0", { file: { name: "a.txt", size: 0 } }],
    ["fractional size", { file: { name: "a.txt", size: 1.5 } }],
    ["size as string", { file: { name: "a.txt", size: "10" } }],
    ["missing name", { file: { size: 10 } }],
    ["neither text nor file", {}],
  ];
  for (const [label, body] of cases) {
    const r = await api("POST", "/api/clips", body);
    if (typeof r.json.code === "string") createdCodes.add(r.json.code);
    check(r.status === 400 && typeof r.json.error === "string", `${label} -> 400`, r);
  }
  const ok = await createFileClip("exact-limit.bin", MAX_FILE_SIZE_BYTES);
  check(ok.status === 201, "declared size exactly at the limit -> 201", ok.status);
}

async function test5OversizeObject() {
  console.log("\n5) Object bigger than the limit");

  // 5a. Real-world path: declared size OK, actual bytes over the limit -> bucket refuses.
  const c = await createFileClip("liar.bin", 1000);
  const put = await putToSignedUrl(c.json.upload.signedUrl, Buffer.alloc(MAX_FILE_SIZE_BYTES + 1, 97));
  check(put.status >= 400 && /EntityTooLarge|413/.test(put.body), `bucket rejects ${MAX_FILE_SIZE_BYTES + 1} bytes`, put);
  check(!(await objectExists(c.json.upload.path)), "no object was stored");
  const done = await api("POST", `/api/clips/${c.json.code}/complete`);
  check(done.status === 409, "complete then reports 409 (nothing uploaded)", done);
  check((await api("GET", `/api/clips/${c.json.code}`)).status === 404, "clip is not readable (404)");

  // 5b. Defence in depth: if an oversized object ever got in, complete deletes object + row.
  //     Simulated with a smaller limit, because the bucket blocks real oversize uploads.
  const d = await createFileClip("too-big-for-complete.bin", 2048);
  await putToSignedUrl(d.json.upload.signedUrl, randomBytes(2048));
  const result = await completeFileUpload(d.json.code, { maxBytes: 1024 });
  check(result === "too_large", "complete (limit 1024) returns too_large -> route sends 413", result);
  check((await rowByCode(d.json.code)) === null, "row deleted");
  check(!(await objectExists(d.json.upload.path)), "object deleted");
}

async function test6FileNameSanitizing() {
  console.log("\n6) File name sanitizing");
  const c = await createFileClip("../../evil.txt", 4);
  check(UUID.test(c.json.upload.path), "storage key is a uuid", c.json.upload.path);
  check(!/evil|\.\./.test(c.json.upload.signedUrl), "signed URL contains no part of the file name");
  await putToSignedUrl(c.json.upload.signedUrl, Buffer.from("evil"), "text/plain");
  await api("POST", `/api/clips/${c.json.code}/complete`);

  const row = await rowByCode(c.json.code);
  check(row?.file_path === row?.id && row?.file_path === c.json.upload.path, "file_path = clip id = upload path", row);
  check(row?.file_name === "evil.txt", 'stored name is "evil.txt"', row?.file_name);
  const meta = await api("GET", `/api/clips/${c.json.code}`);
  check(meta.json.fileName === "evil.txt", 'API returns "evil.txt"', meta.json.fileName);

  const unit: Array<[string, string]> = [
    ["..\\..\\windows\\evil.exe", "evil.exe"],
    ["a\u0000b\nc\t.txt", "abc.txt"],
    ["invoice‮txt.exe", "invoicetxt.exe"],
    ["   ", "file"],
    ["..", "file"],
    ["/", "file"],
    ["x".repeat(300) + ".pdf", "x".repeat(251) + ".pdf"],
  ];
  for (const [input, expected] of unit) {
    const out = sanitizeFileName(input);
    check(out === expected, `sanitize ${JSON.stringify(input.length > 30 ? input.slice(0, 12) + "…" : input)} -> ${JSON.stringify(expected.length > 30 ? expected.slice(0, 12) + "…" : expected)}`, out);
  }
}

async function test7OrphanSweep() {
  console.log("\n7) Orphan sweep");
  // Orphan: an object at a uuid key with no row.
  const orphanKey = randomUUID();
  extraKeys.add(orphanKey);
  const up = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(orphanKey, Buffer.from("orphan"), { contentType: "text/plain" });
  check(!up.error, "orphan object uploaded", up.error?.message);

  // Owned: a pending clip with its object uploaded (not completed).
  const c = await createFileClip("owned.txt", 5);
  await putToSignedUrl(c.json.upload.signedUrl, Buffer.from("owned"), "text/plain");

  // Our objects are seconds old, so use a negative age (cutoff in the future, tolerates
  // clock skew). The production default is 3 hours.
  const r = await sweepOrphanedFiles({ minAgeMs: -5 * 60_000 });
  check(r.deleted >= 1 && r.failed === 0, "sweep deleted at least the orphan", r);
  check(!(await objectExists(orphanKey)), "orphan object is gone");
  check(await objectExists(c.json.upload.path), "object that has a row is kept");

  // Default settings must not touch fresh objects at all.
  const orphan2 = randomUUID();
  extraKeys.add(orphan2);
  await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(orphan2, Buffer.from("fresh"), { contentType: "text/plain" });
  await sweepOrphanedFiles();
  check(await objectExists(orphan2), `fresh orphan (< ${STALE_AFTER_MS / 3_600_000} h old) is kept by default`);
}

async function test8TextOnly() {
  console.log("\n8) Text-only clip unchanged");
  const r = await api("POST", "/api/clips", { text: "plain text clip" });
  if (typeof r.json.code === "string") createdCodes.add(r.json.code);
  check(r.status === 201 && /^\d{6}$/.test(String(r.json.code)) && !("upload" in r.json), "201 { code, expiresAt } with no upload", r);
  const meta = await api("GET", `/api/clips/${r.json.code}`);
  check(meta.status === 200 && meta.json.text === "plain text clip" && meta.json.fileName === null, "fetch returns the text", meta);
  check((await api("GET", `/api/clips/${r.json.code}/download`)).status === 404, "download -> 404 (no file)");
  check((await api("POST", `/api/clips/${r.json.code}/complete`)).status === 404, "complete -> 404 (no file)");
  const empty = await api("POST", "/api/clips", { text: "   " });
  check(empty.status === 400 && empty.json.error === "Text cannot be empty.", "empty text still -> 400");
}

// ---------------------------------------------------------------------------

async function cleanUp() {
  const codes = [...createdCodes];
  const keys = new Set(extraKeys);
  if (codes.length > 0) {
    const { data } = await supabaseAdmin.from("clips").select("file_path").in("code", codes);
    for (const r of data ?? []) if (r.file_path) keys.add(r.file_path);
    // Our own clips also own the key = id, even if file_path was already cleared.
    const { data: ids } = await supabaseAdmin.from("clips").select("id").in("code", codes);
    for (const r of ids ?? []) keys.add(r.id);
  }
  if (keys.size > 0) await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([...keys]);
  if (codes.length > 0) await supabaseAdmin.from("clips").delete().in("code", codes);
  console.log(`\nCleanup: removed ${codes.length} test clip(s) and up to ${keys.size} object(s).`);
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error(`App not reachable or unhealthy at ${BASE}. Start "npm run dev" and pass its URL:\n  npm run test:files -- http://localhost:3001`);
    process.exit(1);
  }
  console.log(`Testing against ${BASE}`);

  const tests = [test1HappyPath, test2NotVisibleBeforeComplete, test3CompleteWithoutUpload, test4DeclaredSizeValidation,
    test5OversizeObject, test6FileNameSanitizing, test7OrphanSweep, test8TextOnly];
  try {
    for (const t of tests) {
      try {
        await t();
      } catch (err) {
        failures++;
        console.error(`  FAIL  ${t.name} threw:`, err);
      }
    }
  } finally {
    await cleanUp();
  }
  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
