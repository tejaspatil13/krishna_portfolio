import "server-only";
import { scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;

/**
 * Admin password comes from the environment, never from code:
 *  - ADMIN_PASSWORD_HASH="scrypt:<salt>:<hex>"  (preferred; `npm run hash-password`)
 *  - ADMIN_PASSWORD="..."                        (plain, still env-only)
 */
export async function checkPassword(input: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    const [scheme, salt, hex] = hash.split(":");
    if (scheme !== "scrypt" || !salt || !hex) return false;
    const derived = await scryptAsync(input, salt, 64);
    const expected = Buffer.from(hex, "hex");
    return expected.length === derived.length && timingSafeEqual(derived, expected);
  }
  const plain = process.env.ADMIN_PASSWORD;
  if (!plain) return false;
  // Hash both sides so the comparison is constant-length.
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(plain).digest();
  return timingSafeEqual(a, b);
}

export function adminConfigured() {
  return Boolean(
    (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD) &&
      process.env.SESSION_SECRET &&
      process.env.SESSION_SECRET.length >= 32,
  );
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Authoritative server-side check for pages and server actions. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// Basic per-instance login throttling.
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

export function loginThrottled(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) return false;
  return rec.count >= MAX_ATTEMPTS;
}
export function recordFailedLogin(key: string) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else rec.count++;
}
export function clearLogin(key: string) {
  attempts.delete(key);
}
