import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  // For CSV download links, also accept ?secret= query param
  const secretParam = req.nextUrl.searchParams.get('secret');
  if (secretParam) {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || secretParam !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const authError = requireAdminAuth(req);
    if (authError) return authError;
  }

  try {
    const db = await getDb();
    const result = await db.execute({
      sql: 'SELECT id, email, name, status, confirmed_at, created_at FROM newsletter_subscribers ORDER BY created_at DESC',
      args: [],
    });

    const subscribers = result.rows.map(row => ({
      id: row.id as string,
      email: row.email as string,
      name: (row.name as string) || '',
      confirmed: (row.status as string) === 'confirmed',
      confirmed_at: (row.confirmed_at as string | null) ?? null,
      created_at: row.created_at as string,
    }));

    const total = subscribers.length;
    const confirmed_count = subscribers.filter(s => s.confirmed).length;

    const format = req.nextUrl.searchParams.get('format');
    if (format === 'csv') {
      const lines = [
        'id,email,name,confirmed,confirmed_at,created_at',
        ...subscribers.map(s =>
          [s.id, s.email, `"${s.name}"`, s.confirmed, s.confirmed_at ?? '', s.created_at].join(',')
        ),
      ];
      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="newsletter-subscribers.csv"',
        },
      });
    }

    return NextResponse.json({ subscribers, total, confirmed_count });
  } catch (err) {
    console.error('Admin newsletter GET error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
