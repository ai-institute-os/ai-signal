import { getArticleBySlug } from '@/lib/db';
import { getRelatedArticles } from '@/lib/related-articles';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return Response.json({ error: 'Artikel ikke fundet' }, { status: 404 });
  }

  const related = await getRelatedArticles(article.id, article.tags, 3);

  return Response.json({ article, related });
}
