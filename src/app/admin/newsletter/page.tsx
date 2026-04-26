import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface SubscriberRow {
  id: string;
  email: string;
  name: string;
  confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
}

interface SubscribersResponse {
  subscribers: SubscriberRow[];
  total: number;
  confirmed_count: number;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

export const dynamic = 'force-dynamic';

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const adminSecret = process.env.ADMIN_SECRET;
  const params = await searchParams;
  const secret = params.secret ?? '';

  if (!adminSecret || secret !== adminSecret) {
    redirect('/');
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/admin/newsletter`, {
    headers: { 'x-admin-secret': adminSecret },
    cache: 'no-store',
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-400 text-sm">
        Kunne ikke hente abonnenter ({res.status}).
      </div>
    );
  }

  const data: SubscribersResponse = await res.json();
  const { subscribers, total, confirmed_count } = data;
  const pending_count = total - confirmed_count;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-lg leading-none">
              <span className="text-[#a78bfa]">AI</span>
              <span className="text-[#e8e8f0]">Signal</span>
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-300">Newsletter — Abonnenter</span>
          </div>
          <a
            href={`/api/admin/newsletter?format=csv&secret=${encodeURIComponent(secret)}`}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Eksporter CSV
          </a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-xs text-zinc-500 mb-1">Total tilmeldte</div>
            <div className="text-3xl font-bold">{total}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-xs text-zinc-500 mb-1">Bekræftede</div>
            <div className="text-3xl font-bold text-emerald-400">{confirmed_count}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-xs text-zinc-500 mb-1">Afventende</div>
            <div className="text-3xl font-bold text-yellow-400">{pending_count}</div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Navn</th>
                  <th className="px-4 py-3 text-center text-zinc-500 font-medium">Bekræftet</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Bekræftet dato</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Tilmeldt dato</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                      Ingen newsletter-abonnenter endnu.
                    </td>
                  </tr>
                )}
                {subscribers.map(s => (
                  <tr
                    key={s.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{s.email}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.name || '—'}</td>
                    <td className="px-4 py-3 text-center text-base">
                      {s.confirmed ? '✅' : '❌'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {formatDate(s.confirmed_at)}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-6 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-bold tracking-tight text-sm">
            <span className="text-[#a78bfa]">AI</span>
            <span className="text-[#e8e8f0]">Signal</span>
          </span>
          <p className="text-xs text-zinc-500">© 2026 AI Institute ApS · CVR 44690615</p>
        </div>
      </footer>
    </div>
  );
}
