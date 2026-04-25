import { NextRequest } from 'next/server';
import { createClient } from '@libsql/client';

function getDb() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }

  const db = getDb();
  const pattern = `%${q}%`;

  const result = await db.execute({
    sql: `SELECT id, title, slug, excerpt
          FROM articles
          WHERE status = 'published'
            AND (title LIKE ? OR excerpt LIKE ?)
          ORDER BY published_at DESC
          LIMIT 6`,
    args: [pattern, pattern],
  });

  const results = result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: row.excerpt as string,
  }));

  return Response.json({ results });
}
