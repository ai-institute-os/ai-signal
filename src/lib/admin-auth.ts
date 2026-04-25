import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates that the request carries a valid ADMIN_SECRET credential.
 *
 * Accepts both header forms for backwards compatibility:
 *   - x-admin-secret: <secret>      (used by /api/admin/* routes)
 *   - Authorization: Bearer <secret> (used by /api/trigger-scan)
 *
 * Never falls back to CRON_SECRET or any other secret — admin and cron
 * credentials must remain strictly separate.
 *
 * Returns null when authorized. Returns a ready NextResponse (401 or 503)
 * when the request must be rejected.
 */
export function requireAdminAuth(req: NextRequest): NextResponse | null {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error('[admin-auth] ADMIN_SECRET env var is not set — admin endpoints are unavailable');
    return NextResponse.json({ error: 'Admin not configured' }, { status: 503 });
  }

  const xAdminSecret = req.headers.get('x-admin-secret');
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const provided = xAdminSecret ?? bearerToken;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  const path = req.nextUrl.pathname;

  if (!provided || provided !== adminSecret) {
    console.warn(`[admin-auth] Unauthorized access attempt — path=${path} ip=${ip}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[admin-auth] Authorized admin request — path=${path} ip=${ip}`);
  return null;
}
