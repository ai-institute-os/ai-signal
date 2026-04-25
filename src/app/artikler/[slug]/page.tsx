'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from '@/lib/db';

interface ArticleResponse {
  article: Article;
  related: Article[];
}

export default function ArtikelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<ArticleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${slug}`)
      .then(async r => {
        if (r.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const json: ArticleResponse = await r.json();
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b border-gray-100 px-6 py-4">
          <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
        </header>
        <main className="max-w-3xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/5" />
          </div>
        </main>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Artikel ikke fundet</h1>
        <p className="text-gray-500 mb-6">Den artikel du søger findes ikke eller er ikke publiceret.</p>
        <Link href="/artikler" className="text-blue-600 hover:underline text-sm">
          Se alle artikler
        </Link>
      </div>
    );
  }

  const { article, related } = data;

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
            <time className="text-xs text-gray-400 mb-3 block">
              {new Date(article.published_at).toLocaleDateString('da-DK', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
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

          <div
            className="prose prose-gray max-w-none leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {related.length > 0 && (
          <aside className="mt-20 pt-10 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
              Du vil måske også synes om
            </h2>
            <ul className="grid gap-8 sm:grid-cols-3">
              {related.map(rel => (
                <li key={rel.id}>
                  <Link href={`/artikler/${rel.slug}`} className="group block">
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
