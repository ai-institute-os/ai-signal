import { getDb, getPublishedArticles, type Article } from './db';

export async function markArticleRead(companyId: string, articleId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO article_reads (company_id, article_id) VALUES (?, ?)`,
    args: [companyId, articleId],
  });
}

export async function getReadArticleIds(companyId: string): Promise<Set<string>> {
  const db = await getDb();
  const r = await db.execute({
    sql: 'SELECT article_id FROM article_reads WHERE company_id = ?',
    args: [companyId],
  });
  return new Set(r.rows.map(row => row.article_id as string));
}

export async function getRelatedArticlesForUser(
  articleId: string,
  tags: string[],
  companyId: string | null,
  limit = 3
): Promise<Article[]> {
  const readIds = companyId ? await getReadArticleIds(companyId) : new Set<string>();
  const all = await getPublishedArticles(200);
  const others = all.filter(a => a.id !== articleId);

  const tagSet = new Set(tags);
  const scored = others.map(a => ({
    article: a,
    tagScore: tags.length > 0 ? a.tags.filter(t => tagSet.has(t)).length : 0,
    isRead: readIds.has(a.id),
  }));

  scored.sort((a, b) => {
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    if (b.tagScore !== a.tagScore) return b.tagScore - a.tagScore;
    return new Date(b.article.published_at).getTime() - new Date(a.article.published_at).getTime();
  });

  return scored.slice(0, limit).map(s => s.article);
}
