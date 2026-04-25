import { NextRequest } from 'next/server';
import { getArticleBySlug } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getRelatedArticlesForUser } from '@/lib/reading-progress';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return Response.json({ error: 'Artikel ikke fundet' }, { status: 404 });
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  const related = await getRelatedArticlesForUser(
    article.id,
    article.tags,
    session?.companyId ?? null,
    3
  );

  return Response.json({ article, related });
}
