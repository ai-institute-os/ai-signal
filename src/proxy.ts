import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { CURRENT_VERSION, isDeprecatedPath } from '@/lib/api-version';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes: attach version header (and deprecation headers for old paths)
  if (pathname.startsWith('/api/')) {
    const res = NextResponse.next();
    res.headers.set('X-API-Version', CURRENT_VERSION);
    if (isDeprecatedPath(pathname)) {
      res.headers.set('Deprecation', 'Sat, 25 Apr 2026 00:00:00 GMT');
      res.headers.set('Sunset', 'Sun, 25 Oct 2026 00:00:00 GMT');
      res.headers.set('Link', '<https://docs.aiinstitute.dk/api/migration>; rel="deprecation"');
    }
    return res;
  }

  // Dashboard routes: require valid session for the matching company
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  if (match) {
    const companyId = match[1];
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;

    if (!session || session.companyId !== companyId) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
