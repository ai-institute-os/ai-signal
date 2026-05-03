/**
 * API versioning utilities shared across InsideAI API routes.
 *
 * Usage in a route handler:
 *   import { withVersion, withDeprecation } from "@/lib/api-version";
 *   return withDeprecation(NextResponse.json({ ... }));
 */

import { NextResponse } from "next/server";

export const CURRENT_VERSION = "v1";

const DEPRECATED_SINCE = "Sat, 25 Apr 2026 00:00:00 GMT";
const SUNSET_DATE = "Sun, 25 Oct 2026 00:00:00 GMT";
const MIGRATION_LINK = '<https://docs.aiinstitute.dk/api/migration>; rel="deprecation"';

/**
 * Unversioned API paths deprecated in favour of /api/v1/ equivalents.
 * Webhooks, cron jobs, and admin routes are intentionally excluded.
 */
const DEPRECATED_PREFIXES = [
  "/api/login",
  "/api/logout",
  "/api/signup",
  "/api/companies",
  "/api/monitor",
  "/api/monitoring",
  "/api/subscribers",
  "/api/unsubscribe",
  "/api/upsell",
  "/api/trigger-scan",
];

export function isDeprecatedPath(pathname: string): boolean {
  return DEPRECATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Attach X-API-Version header to any response. */
export function withVersion(res: NextResponse): NextResponse {
  res.headers.set("X-API-Version", CURRENT_VERSION);
  return res;
}

/** Attach Deprecation + Sunset + Link headers (in addition to X-API-Version). */
export function withDeprecation(res: NextResponse): NextResponse {
  withVersion(res);
  res.headers.set("Deprecation", DEPRECATED_SINCE);
  res.headers.set("Sunset", SUNSET_DATE);
  res.headers.set("Link", MIGRATION_LINK);
  return res;
}
