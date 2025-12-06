// services/api.ts
import Constants from "expo-constants";

let AUTH_TOKEN: string | null = null;

// נקרא את ה-API_URL מתוך extra
const API_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "http://10.185.245.136:3005"; // fallback לפיתוח, אם חסר

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

export async function apiFetch(url: string, opts: FetchOpts = {}) {
  const headers = new Headers(opts.headers || {});
  if (!opts.skipAuthHeader && AUTH_TOKEN) {
    headers.set("x-api-key", AUTH_TOKEN);
  }

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {
    emitUnauthorized();
  }

  return res;
}

export async function apiGet(url: string) {
  const res = await apiFetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`API_GET_FAILED_${res.status}`);
  return res.json();
}

export async function apiPost(
  url: string,
  body: any,
  opts: Omit<FetchOpts, "method" | "body"> = {}
) {
  const res = await apiFetch(url, {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API_POST_FAILED_${res.status}`);
  return res.json();
}
