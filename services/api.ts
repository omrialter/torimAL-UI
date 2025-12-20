// services/api.ts
import Constants from "expo-constants";

let AUTH_TOKEN: string | null = null;

// קריאת ה-API_URL
const API_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "http://10.0.0.6:3005"; // fallback (local)

export const URL = API_URL;
export const TOKEN_KEY = "posts_token";

type UnauthListener = () => void;
const unauthListeners: UnauthListener[] = [];

export function setAuthToken(token: string | null) {
  AUTH_TOKEN = token;
}

export function onUnauthorized(listener: UnauthListener) {
  unauthListeners.push(listener);
  return () => {
    const i = unauthListeners.indexOf(listener);
    if (i >= 0) unauthListeners.splice(i, 1);
  };
}

function emitUnauthorized() {
  unauthListeners.forEach((fn) => {
    try {
      fn();
    } catch { }
  });
}

type FetchOpts = RequestInit & { skipAuthHeader?: boolean };

// -------------------------
// Low-level fetch wrapper
// -------------------------
export async function apiFetch(url: string, opts: FetchOpts = {}) {
  const headers = new Headers(opts.headers || {});

  // auth header
  if (!opts.skipAuthHeader && AUTH_TOKEN) {
    headers.set("x-api-key", AUTH_TOKEN);
  }

  // if URL is relative, prefix API_URL
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  console.log(`📡 Fetching: ${fullUrl}`);

  const res = await fetch(fullUrl, { ...opts, headers });

  if (res.status === 401) {
    emitUnauthorized();
  }

  return res;
}

// -------------------------
// Helpers
// -------------------------
async function parseJsonSafe(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function throwApiError(res: Response, prefix: string) {
  const payload = await parseJsonSafe(res);

  // ננסה להוציא הודעה טובה מהשרת
  const serverMsg =
    payload?.message ||
    payload?.error ||
    payload?.details ||
    payload?.err ||
    null;

  const msg = serverMsg
    ? `${prefix}_${res.status}: ${String(serverMsg)}`
    : `${prefix}_${res.status}`;

  const error: any = new Error(msg);
  error.status = res.status;
  error.payload = payload;
  throw error;
}

type JsonOpts = Omit<FetchOpts, "method" | "body">;

// -------------------------
// REST helpers
// -------------------------
export async function apiGet(url: string, opts: JsonOpts = {}) {
  const res = await apiFetch(url, { ...opts, method: "GET" });
  if (!res.ok) await throwApiError(res, "API_GET_FAILED");
  return parseJsonSafe(res);
}

export async function apiPost<T = any>(
  url: string,
  body: any,
  opts: Omit<FetchOpts, "method" | "body"> = {}
): Promise<T> {
  const res = await apiFetch(url, {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });

  let payload: any = null;
  try {
    payload = await res.json();
  } catch { }

  if (!res.ok) {
    const err: any = new Error(payload?.error || `API_POST_FAILED_${res.status}`);
    err.status = res.status;
    err.payload = payload; // ✅ חשוב כדי שתוכל להציג details
    throw err;
  }

  return payload as T;
}

export async function apiPatch(url: string, body: any, opts: JsonOpts = {}) {
  const res = await apiFetch(url, {
    ...opts,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, "API_PATCH_FAILED");
  return parseJsonSafe(res);
}

export async function apiPut(url: string, body: any, opts: JsonOpts = {}) {
  const res = await apiFetch(url, {
    ...opts,
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, "API_PUT_FAILED");
  return parseJsonSafe(res);
}

export async function apiDelete(url: string, opts: JsonOpts = {}) {
  const res = await apiFetch(url, { ...opts, method: "DELETE" });
  if (!res.ok) await throwApiError(res, "API_DELETE_FAILED");
  return parseJsonSafe(res);
}
