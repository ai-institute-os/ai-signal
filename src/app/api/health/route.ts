import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

const CRON_SCHEDULE = "0 8 * * 1";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    await db.execute("SELECT 1");

    return NextResponse.json({
      status: "ok",
      db: "connected",
      cron: CRON_SCHEDULE,
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        cron: CRON_SCHEDULE,
        timestamp,
      },
      { status: 503 }
    );
  }
}
