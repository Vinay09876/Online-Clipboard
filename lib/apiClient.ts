/**
 * Browser-side API client. Typed fetch wrappers + mapping of every failure to a
 * small set of error kinds. Components never see raw API error text.
 *
 * Client-safe: imports nothing from the server (no lib/config, no Supabase).
 */

export type ApiError =
  | { kind: "not_found" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unavailable" } // 503: service full or temporarily unable
  | { kind: "downloads_paused" } // 503 from /download: monthly download budget used up
  | { kind: "too_large" } // 413
  | { kind: "unsupported" } // 415
  | { kind: "bad_request" } // 400
  | { kind: "not_uploaded" } // 409 from complete
  | { kind: "network" } // fetch threw / offline
  | { kind: "unexpected"; status?: number }; // 5xx, odd status, malformed body

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** Server clock minus client clock, in ms (from the Date header). Corrects countdowns on devices with a wrong clock. */
let clockSkewMs = 0;
export function serverNow(): number {
  return Date.now() + clockSkewMs;
}
/** Converts a server timestamp (ISO) to "client clock" milliseconds. */
export function toClientTime(iso: string): number {
  return new Date(iso).getTime() - clockSkewMs;
}

function updateSkew(res: Response) {
  const date = Date.parse(res.headers.get("date") ?? "");
  if (Number.isFinite(date)) clockSkewMs = date - Date.now();
}

function errorFromStatus(status: number, headers: Headers): ApiError {
  switch (status) {
    case 400:
      return { kind: "bad_request" };
    case 404:
      return { kind: "not_found" };
    case 409:
      return { kind: "not_uploaded" };
    case 413:
      return { kind: "too_large" };
    case 415:
      return { kind: "unsupported" };
    case 429: {
      const s = Number(headers.get("retry-after"));
      return { kind: "rate_limited", retryAfterSeconds: Number.isFinite(s) && s > 0 ? Math.ceil(s) : 60 };
    }
    case 503:
      return { kind: "unavailable" };
    default:
      return { kind: "unexpected", status };
  }
}

async function request<T>(
  method: "GET" | "POST",
  url: string,
  body: unknown,
  okStatus: number,
  isValid: (v: unknown) => v is T,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }
  updateSkew(res);

  if (res.status !== okStatus) {
    if (res.status === 503) {
      // The only 503 with a machine-readable reason; everything else stays generic.
      const reason = await res
        .json()
        .then((b: unknown) => (isObj(b) ? b.reason : undefined))
        .catch(() => undefined);
      if (reason === "downloads_paused") return { ok: false, error: { kind: "downloads_paused" } };
    }
    return { ok: false, error: errorFromStatus(res.status, res.headers) };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: { kind: "unexpected", status: res.status } };
  }
  return isValid(data) ? { ok: true, data } : { ok: false, error: { kind: "unexpected", status: res.status } };
}

// ---------------------------------------------------------------------------
// Response shapes (validated, never trusted blindly)
// ---------------------------------------------------------------------------

export type UploadTarget = { signedUrl: string; token: string; path: string };
export type CreatedClip = { code: string; expiresAt: string; upload?: UploadTarget };
export type ClipData = {
  text: string | null;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  expiresAt: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isCode = (v: unknown): v is string => typeof v === "string" && /^[0-9]{6}$/.test(v);
const isDate = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));
const strOrNull = (v: unknown) => v === null || typeof v === "string";

function isCreated(v: unknown): v is CreatedClip {
  if (!isObj(v) || !isCode(v.code) || !isDate(v.expiresAt)) return false;
  if (v.upload === undefined) return true;
  const u = v.upload;
  return isObj(u) && typeof u.signedUrl === "string" && /^https?:\/\//.test(u.signedUrl) && typeof u.path === "string";
}
function isClip(v: unknown): v is ClipData {
  return (
    isObj(v) &&
    strOrNull(v.text) &&
    strOrNull(v.fileName) &&
    (v.fileSize === null || typeof v.fileSize === "number") &&
    isDate(v.createdAt) &&
    isDate(v.expiresAt)
  );
}
const isOk = (v: unknown): v is { ok: true } => isObj(v) && v.ok === true;
const isDownload = (v: unknown): v is { url: string; expiresIn: number } =>
  isObj(v) && typeof v.url === "string" && /^https?:\/\//.test(v.url);

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export function createClip(input: { text?: string; file?: { name: string; size: number } }) {
  return request("POST", "/api/clips", input, 201, isCreated);
}

export function completeUpload(code: string) {
  return request("POST", `/api/clips/${code}/complete`, undefined, 200, isOk);
}

export function getClip(code: string) {
  return request("GET", `/api/clips/${code}`, undefined, 200, isClip);
}

export function getDownloadUrl(code: string) {
  return request("GET", `/api/clips/${code}/download`, undefined, 200, isDownload);
}

// ---------------------------------------------------------------------------
// File upload (XHR, for progress events)
// ---------------------------------------------------------------------------

export type UploadOutcome =
  | { ok: true }
  | { ok: false; reason: "aborted" | "timeout" | "network" | "too_large" | "failed" };

/**
 * PUTs the file to the signed Supabase URL. No API key is sent: the token in the
 * URL authorizes this one upload. Returns a promise plus an abort() function.
 */
export function uploadFile(
  signedUrl: string,
  file: File,
  onProgress: (loaded: number, total: number) => void,
): { done: Promise<UploadOutcome>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const done = new Promise<UploadOutcome>((resolve) => {
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.timeout = 15 * 60 * 1000; // generous: 25 MB on a slow mobile connection

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status === 200) return resolve({ ok: true });
      const body = xhr.responseText ?? "";
      // Retrying after a dropped connection: the object may already be there.
      if (/KeyAlreadyExists|Duplicate/.test(body)) return resolve({ ok: true });
      if (xhr.status === 413 || /EntityTooLarge|"413"/.test(body)) return resolve({ ok: false, reason: "too_large" });
      resolve({ ok: false, reason: "failed" });
    };
    xhr.onerror = () => resolve({ ok: false, reason: "network" });
    xhr.onabort = () => resolve({ ok: false, reason: "aborted" });
    xhr.ontimeout = () => resolve({ ok: false, reason: "timeout" });

    xhr.send(file);
  });
  return { done, abort: () => xhr.abort() };
}

// ---------------------------------------------------------------------------
// Friendly messages
// ---------------------------------------------------------------------------

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** User-facing text for an API error. Rate limits are shown separately (live countdown). */
export function errorMessage(error: ApiError, ctx: { maxFileMb?: number } = {}): string {
  switch (error.kind) {
    case "not_found":
      return "Clip not found or expired.";
    case "rate_limited":
      return "Too many attempts. Please wait a moment.";
    case "unavailable":
      return "The service is busy or full right now. Please try again in a few minutes.";
    case "downloads_paused":
      return "Downloads are paused until next month: this free service has used its monthly download allowance. Text clips still work.";
    case "too_large":
      return ctx.maxFileMb ? `That file is too large. The limit is ${ctx.maxFileMb} MB.` : "That is too large to send.";
    case "unsupported":
    case "bad_request":
      return "That request wasn't accepted. Check what you're sending and try again.";
    case "not_uploaded":
      return "The file didn't finish uploading. Please try again.";
    case "network":
      return "Can't reach the server. Check your connection and try again.";
    case "unexpected":
      return "Something went wrong on our side. Please try again.";
  }
}
