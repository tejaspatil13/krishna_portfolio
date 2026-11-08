/**
 * Stateless admin session: `<base64url payload>.<base64url HMAC-SHA256>`.
 * Uses Web Crypto so it works in Proxy and in Node route handlers alike.
 */
export const SESSION_COOKIE = "kp_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

async function hmac(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signSession(): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET must be set (32+ characters).");
  const payload = b64url(
    enc.encode(JSON.stringify({ sub: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })),
  );
  return `${payload}.${b64url(await hmac(payload, secret))}`;
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const secret = sessionSecret();
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  try {
    const expected = await hmac(payload, secret);
    const given = fromB64url(sig);
    if (given.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < given.length; i++) diff |= given[i] ^ expected[i];
    if (diff !== 0) return false;
    const { sub, exp } = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    return sub === "admin" && typeof exp === "number" && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}
