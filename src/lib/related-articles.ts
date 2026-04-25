import { getPublishedArticles, type Article } from './db';

export async function getRelatedArticles(
  articleId: string,
  tags: string[],
  limit = 3
): Promise<Article[]> {
  const all = await getPublishedArticles(200);
  const others = all.filter(a => a.id !== articleId);

  if (tags.length === 0) {
    return others.slice(0, limit);
  }

  const tagSet = new Set(tags);
  const scored = others.map(a => ({
    article: a,
    score: a.tags.filter(t => tagSet.has(t)).length,
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.article.published_at).getTime() - new Date(a.article.published_at).getTime();
  });

  return scored.slice(0, limit).map(s => s.article);
}
