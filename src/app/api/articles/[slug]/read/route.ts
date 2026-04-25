import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { markArticleRead } from '@/lib/reading-progress';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Ikke autoriseret.' }, { status: 401 });
  }

  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return NextResponse.json({ error: 'Artikel ikke fundet.' }, { status: 404 });
  }

  await markArticleRead(session.companyId, article.id);
  return NextResponse.json({ ok: true });
}
