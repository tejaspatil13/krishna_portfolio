import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * Optimistic gate for admin pages. Every admin page, server action and the
 * upload route also verify the session server-side.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    return authed ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }
  if (!authed) return NextResponse.redirect(new URL("/admin/login", request.url));

  const res = NextResponse.next();
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
