import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "prism_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    const cookie = req.cookies.get(SESSION_COOKIE)?.value;
    if (!cookie) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    try {
      const { role } = JSON.parse(cookie) as { role?: string };
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/403", req.url)); 
      }
    } catch {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
