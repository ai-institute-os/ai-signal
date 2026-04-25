import { NextRequest, NextResponse } from "next/server";
import { CURRENT_VERSION, isDeprecatedPath } from "@/lib/api-version";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("X-API-Version", CURRENT_VERSION);
    if (isDeprecatedPath(pathname)) {
      res.headers.set("Deprecation", "Sat, 25 Apr 2026 00:00:00 GMT");
      res.headers.set("Sunset", "Sun, 25 Oct 2026 00:00:00 GMT");
      res.headers.set("Link", '<https://docs.aiinstitute.dk/api/migration>; rel="deprecation"');
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
