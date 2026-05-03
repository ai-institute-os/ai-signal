import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getArticleBySlug } from '@/lib/db';
import { getRelatedArticles } from '@/lib/related-articles';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function readingTime(content: string): number {
  const words = stripHtml(content).split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function truncateWords(text: string, limit: number): string {
  const words = text.split(' ').filter(Boolean);
  if (words.length <= limit) return text;
  return words.slice(0, limit).join(' ') + '…';
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAME)?.value;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  const isLoggedIn = session !== null;

  const article = await getArticleBySlug(slug);
  if (!article || article.status !== 'published') {
    notFound();
  }

  const related = await getRelatedArticles(article.id, article.tags, 3);
  const minutes = readingTime(article.content);

  const plainText = stripHtml(article.content);
  const wordCount = plainText.split(' ').filter(Boolean).length;
  const isGated = !isLoggedIn && wordCount > 100;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <Link href="/artikler" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Alle artikler
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <article>
          <header className="mb-10">
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
              <time>
                {new Date(article.published_at).toLocaleDateString('da-DK', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>
              <span>·</span>
              <span>{minutes} min. læsetid</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
              {article.title}
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-6">{article.excerpt}</p>
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {isGated ? (
            <div>
              <p className="leading-relaxed text-gray-700">
                {truncateWords(plainText, 100)}
              </p>
              <div className="relative h-20 -mt-4 bg-gradient-to-b from-transparent to-white pointer-events-none" />
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-8 text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Læs hele artiklen</h2>
                <p className="text-gray-500 mb-6 text-sm">
                  Opret en gratis konto for at læse alle InsideAI-artikler og holde dig opdateret på AI i Danmark.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/"
                    className="inline-block bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Opret gratis konto
                  </Link>
                  <Link
                    href="/login"
                    className="inline-block bg-white border border-gray-200 text-gray-700 text-sm font-medium px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Log ind
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="prose prose-gray max-w-none leading-relaxed text-gray-700"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          )}
        </article>

        {related.length > 0 && (
          <aside className="mt-20 pt-10 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
              Du vil måske også synes om
            </h2>
            <ul className="grid gap-8 sm:grid-cols-3">
              {related.map(rel => (
                <li key={rel.id}>
                  <Link href={`/articles/${rel.slug}`} className="group block">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug mb-2">
                      {rel.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed">
                      {rel.excerpt}
                    </p>
                    {rel.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {rel.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </main>
    </div>
  );
}
