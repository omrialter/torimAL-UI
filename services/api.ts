// services/api.ts
import Constants from "expo-constants";

// ----------------------------------------------------------------------
// Configuration & State
// ----------------------------------------------------------------------

/**
 * כתובת השרת.
 * נלקחת מהקונפיגורציה של Expo ב-Prod, או כתובת מקומית כ-Fallback לפיתוח.
 */
const API_URL = Constants.expoConfig?.extra?.API_URL || "http://10.0.0.12:3005";

export const URL = API_URL;
export const TOKEN_KEY = "posts_token";

let AUTH_TOKEN: string | null = null;

// ניהול מאזינים למקרה של שגיאת 401 (Unauthorized)
type UnauthListener = () => void;
const unauthListeners: UnauthListener[] = [];

// ----------------------------------------------------------------------
// Auth Helpers
// ----------------------------------------------------------------------

/**
 * מגדיר את הטוקן שיישלח בכל בקשה לשרת.
 */
export function setAuthToken(token: string | null) {
  AUTH_TOKEN = token;
}

/**
 * רישום פונקציה שתרוץ כאשר השרת מחזיר 401.
 * בדרך כלל משמש להעברת המשתמש למסך התחברות.
 */
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

// ----------------------------------------------------------------------
// Core Fetch Wrapper
// ----------------------------------------------------------------------

type FetchOpts = RequestInit & { skipAuthHeader?: boolean };

/**
 * פונקציית מעטפת בסיסית ל-fetch.
 * מוסיפה אוטומטית את ה-Header של האותנטיקציה ומטפלת בכתובת המלאה.
 */
export async function apiFetch(url: string, opts: FetchOpts = {}) {
  const headers = new Headers(opts.headers || {});

  // הוספת הטוקן אם קיים ולא ביקשנו לדלג עליו
  if (!opts.skipAuthHeader && AUTH_TOKEN) {
    headers.set("x-api-key", AUTH_TOKEN);
  }

  // בניית כתובת מלאה אם נשלח נתיב יחסי
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  const res = await fetch(fullUrl, { ...opts, headers });

  // זיהוי גלובלי של פקיעת תוקף טוקן
  if (res.status === 401) {
    emitUnauthorized();
  }

  return res;
}

// ----------------------------------------------------------------------
// Error & Response Parsing Helpers
// ----------------------------------------------------------------------

/**
 * מנסה לפענח JSON מהתשובה בצורה בטוחה.
 * אם התוכן אינו JSON או שיש שגיאה, מחזיר null.
 */
async function parseJsonSafe(res: Response) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * זורק שגיאה עם פרטים מהשרת אם הבקשה נכשלה.
 */
async function throwApiError(res: Response, prefix: string) {
  const payload = await parseJsonSafe(res);

  // חילוץ הודעת שגיאה מהפורמטים הנפוצים בשרת
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
  error.payload = payload; // גישה לנתונים הגולמיים של השגיאה
  throw error;
}

type JsonOpts = Omit<FetchOpts, "method" | "body">;

// ----------------------------------------------------------------------
// REST Methods
// ----------------------------------------------------------------------

export async function apiGet<T = any>(url: string, opts: JsonOpts = {}): Promise<T | null> {
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

  if (!res.ok) {
    // משתמשים באותו מנגנון שגיאה אחיד כמו בשאר הפונקציות
    await throwApiError(res, "API_POST_FAILED");
  }

  // מחזירים את הפיילוד
  const data = await parseJsonSafe(res);
  return data as T;
}

export async function apiPut<T = any>(url: string, body: any, opts: JsonOpts = {}): Promise<T | null> {
  const res = await apiFetch(url, {
    ...opts,
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, "API_PUT_FAILED");
  return parseJsonSafe(res);
}

export async function apiPatch<T = any>(url: string, body: any, opts: JsonOpts = {}): Promise<T | null> {
  const res = await apiFetch(url, {
    ...opts,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwApiError(res, "API_PATCH_FAILED");
  return parseJsonSafe(res);
}

export async function apiDelete<T = any>(url: string, opts: JsonOpts = {}): Promise<T | null> {
  const res = await apiFetch(url, { ...opts, method: "DELETE" });
  if (!res.ok) await throwApiError(res, "API_DELETE_FAILED");
  return parseJsonSafe(res);
}