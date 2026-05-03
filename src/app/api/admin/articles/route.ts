import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAllArticles, createArticle } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const articles = await getAllArticles();
  return NextResponse.json({ articles });
}

export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    tags?: string[];
    author?: string;
    status?: 'draft' | 'published';
    published_at?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, slug, excerpt, content, tags, author, status, published_at } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!slug?.trim()) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 });

  const article = await createArticle({
    id: crypto.randomUUID(),
    title: title.trim(),
    slug: slug.trim(),
    excerpt: (excerpt ?? '').trim(),
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
    author: author?.trim() || 'InsideAI',
    status: status === 'draft' ? 'draft' : 'published',
    published_at: published_at || new Date().toISOString(),
  });

  return NextResponse.json({ article }, { status: 201 });
}
