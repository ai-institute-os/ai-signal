import { NextResponse } from "next/server";
import { createClient } from "@libsql/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    await db.execute("SELECT 1");

    const result = await db.execute(
      "SELECT COUNT(*) as cnt FROM companies WHERE subscriber_status = 'active'"
    );
    const subscribers = Number(result.rows[0].cnt ?? 0);

    return NextResponse.json({
      status: "ok",
      db: "ok",
      subscribers,
      timestamp,
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "error",
        timestamp,
      },
      { status: 503 }
    );
  }
}
