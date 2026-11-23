import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/admin/login") return NextResponse.next();
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && await getToken({ req: request, secret, secureCookie: process.env.NODE_ENV === "production" })) {
    return NextResponse.next();
  }
  if (path.startsWith("/api/admin")) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
