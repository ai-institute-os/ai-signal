import { getPublishedArticles } from '@/lib/db';

export async function GET() {
  const articles = await getPublishedArticles(50);
  return Response.json(articles);
}
