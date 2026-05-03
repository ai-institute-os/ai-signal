'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[40px] rounded-lg bg-zinc-800 border border-zinc-700 focus-within:border-violet-500 px-3 py-2 cursor-text"
      onClick={() => (document.getElementById('tag-input') as HTMLInputElement)?.focus()}
    >
      {tags.map(t => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-xs text-violet-300"
        >
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            className="hover:text-red-400 transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id="tag-input"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? 'Skriv tag, tryk Enter eller komma...' : ''}
        className="flex-1 min-w-[160px] bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
      />
    </div>
  );
}

export default function NewArticlePage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [author, setAuthor] = useState('InsideAI');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [publishedAt, setPublishedAt] = useState(() => new Date().toISOString().slice(0, 10));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_secret');
    if (stored) {
      setSecret(stored);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!slugManual) {
      setSlug(slugify(title));
    }
  }, [title, slugManual]);

  const verifySecret = async (s: string) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/articles', { headers: { 'x-admin-secret': s } });
      if (res.status === 401) {
        setLoginError('Forkert admin-adgangskode.');
        return;
      }
      sessionStorage.setItem('admin_secret', s);
      setAuthed(true);
    } catch {
      setLoginError('Kunne ikke kontakte server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret) verifySecret(secret);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Titel er påkrævet.'); return; }
    if (!slug.trim()) { setError('Slug er påkrævet.'); return; }
    if (!content.trim()) { setError('Indhold er påkrævet.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': secret,
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          content: content.trim(),
          tags,
          author: author.trim() || 'InsideAI',
          status,
          published_at: new Date(publishedAt).toISOString(),
        }),
      });

      if (res.status === 401) {
        sessionStorage.removeItem('admin_secret');
        setAuthed(false);
        return;
      }

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Noget gik galt.');
        return;
      }

      router.push('/admin/articles');
    } catch {
      setError('Netværksfejl — prøv igen.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold tracking-tight text-lg leading-none">
                  <span className="text-[#a78bfa]">AI</span>
                  <span className="text-[#e8e8f0]">Signal</span>
                </span>
                <span className="text-xs text-zinc-500 font-medium">Admin</span>
              </div>
              <p className="text-xs text-zinc-500">Kun til intern brug</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Admin-adgangskode</label>
                <input
                  type="password"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                  placeholder="ADMIN_SECRET"
                  autoFocus
                />
              </div>
              {loginError && <p className="text-xs text-red-400">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading || !secret}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-2 text-sm font-medium text-white transition-colors"
              >
                {loginLoading ? 'Logger ind...' : 'Log ind'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-lg leading-none">
              <span className="text-[#a78bfa]">AI</span>
              <span className="text-[#e8e8f0]">Signal</span>
            </span>
            <span className="text-zinc-600">/</span>
            <button
              onClick={() => router.push('/admin/articles')}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Artikler
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-300">Ny artikel</span>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_secret');
              setAuthed(false);
            }}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Log ud
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titel */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Titel <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
              placeholder="Artiklens titel..."
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Slug <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 font-mono"
              placeholder="url-venlig-slug"
              required
            />
            {!slugManual && title && (
              <p className="text-xs text-zinc-600 mt-1">Auto-genereret fra titel</p>
            )}
          </div>

          {/* Uddrag */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Uddrag</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              rows={2}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
              placeholder="Kort beskrivelse til oversigter og SEO..."
            />
          </div>

          {/* Indhold */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Indhold <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={16}
              className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-y font-mono leading-relaxed"
              placeholder="Artiklens indhold (Markdown understøttes)..."
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
            <p className="text-xs text-zinc-600 mt-1">Tryk Enter eller komma for at tilføje et tag</p>
          </div>

          {/* Forfatter + Status + Dato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Forfatter</label>
              <input
                type="text"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                placeholder="InsideAI"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
              <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                {(['published', 'draft'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      status === s ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {s === 'published' ? 'Publiceret' : 'Kladde'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Publiceringsdato</label>
              <input
                type="date"
                value={publishedAt}
                onChange={e => setPublishedAt(e.target.value)}
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => router.push('/admin/articles')}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-6 py-2 text-sm font-medium text-white transition-colors"
            >
              {submitting ? 'Opretter...' : 'Opret artikel'}
            </button>
          </div>
        </form>
      </main>

      <footer className="border-t border-[#2a2a3a] px-6 py-6 mt-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold tracking-tight text-sm">
              <span className="text-[#a78bfa]">AI</span>
              <span className="text-[#e8e8f0]">Signal</span>
            </span>
            <span className="text-xs text-[#888898] ml-2">Admin</span>
          </div>
          <p className="text-xs text-[#888898]">© 2026 AI Institute ApS · CVR 44690615</p>
        </div>
      </footer>
    </div>
  );
}
