'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Article } from '@/lib/db';

export default function ArtiklerPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/articles').then(r => r.json()),
      fetch('/api/articles/read-status').then(r => r.json()).catch(() => ({ readIds: [] })),
    ]).then(([arts, status]) => {
      setArticles(arts as Article[]);
      setReadIds(new Set((status as { readIds: string[] }).readIds));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
          ← Tilbage til InsideAI
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Artikler</h1>
        <p className="text-gray-500 mb-12">Viden om AI-synlighed og hvad det betyder for din virksomhed.</p>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-full mb-1" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-gray-400">Ingen artikler endnu.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {articles.map(article => {
              const isRead = readIds.has(article.id);
              return (
                <li key={article.id} className="py-8">
                  <Link href={`/artikler/${article.slug}`} className="group block">
                    <div className="flex items-center gap-3 mb-2">
                      <time className="text-xs text-gray-400">
                        {new Date(article.published_at).toLocaleDateString('da-DK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                      {isRead && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Læst
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                      {article.title}
                    </h2>
                    <p className="text-gray-500 leading-relaxed mb-3">{article.excerpt}</p>
                    {article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
