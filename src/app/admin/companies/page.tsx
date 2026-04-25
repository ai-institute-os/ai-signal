'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CompanyRow {
  id: string;
  name: string;
  domain: string;
  email: string;
  category: string;
  plan: 'free' | 'premium';
  trialActive: boolean;
  trialDaysLeft: number | null;
  trialEndsAt: string | null;
  stripeSubscriptionStatus: string | null;
  latestScore: number | null;
  prevScore: number | null;
  trend: number | null;
  latestMentionRate: number | null;
  latestChosenRate: number | null;
  createdAt: string;
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return <span className="text-zinc-600">—</span>;
  if (trend > 0) return <span className="text-green-400">↑ +{trend}</span>;
  if (trend < 0) return <span className="text-red-400">↓ {trend}</span>;
  return <span className="text-zinc-500">→ 0</span>;
}

function PlanBadge({ company }: { company: CompanyRow }) {
  if (company.plan === 'premium' && company.trialActive) {
    return (
      <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 text-xs text-violet-400">
        Trial ({company.trialDaysLeft}d)
      </span>
    );
  }
  if (company.plan === 'premium' && company.stripeSubscriptionStatus === 'active') {
    return (
      <span className="rounded-full bg-green-500/20 border border-green-500/30 px-2 py-0.5 text-xs text-green-400">
        Premium
      </span>
    );
  }
  return (
    <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
      Free
    </span>
  );
}

export default function AdminCompaniesPage() {
  const router = useRouter();
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'premium'>('all');
  const [filterTrial, setFilterTrial] = useState<'all' | 'active' | 'expired' | 'none'>('all');
  const [search, setSearch] = useState('');

  const fetchCompanies = async (adminSecret: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/companies', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (res.status === 401) {
        setError('Forkert admin-adgangskode.');
        return;
      }
      const d = await res.json();
      setCompanies(d.companies ?? []);
      setAuthed(true);
      sessionStorage.setItem('admin_secret', adminSecret);
    } catch {
      setError('Kunne ikke hente data.');
    } finally {
      setLoading(false);
    }
  };

  // Restore session secret on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_secret');
    if (stored) {
      setSecret(stored);
      fetchCompanies(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret) fetchCompanies(secret);
  };

  const filtered = companies.filter(c => {
    if (filterPlan !== 'all' && c.plan !== filterPlan) return false;
    if (filterTrial === 'active' && !c.trialActive) return false;
    if (filterTrial === 'expired' && (c.trialActive || !c.trialEndsAt)) return false;
    if (filterTrial === 'none' && c.trialEndsAt) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.domain.toLowerCase().includes(search.toLowerCase()) &&
        !c.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold tracking-tight text-lg leading-none"><span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span></span>
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
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || !secret}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-2 text-sm font-medium text-white transition-colors"
              >
                {loading ? 'Logger ind...' : 'Log ind'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-lg leading-none"><span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span></span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-300">Admin — Kundeoverview</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{companies.length} virksomheder</span>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_secret');
                setAuthed(false);
                setCompanies([]);
              }}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Log ud
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søg på navn, domæne eller email..."
            className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 w-72"
          />
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(['all', 'free', 'premium'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPlan(p)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterPlan === p ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {p === 'all' ? 'Alle planer' : p === 'free' ? 'Free' : 'Premium'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            {(['all', 'active', 'expired', 'none'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterTrial(t)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterTrial === t ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Alle trials' : t === 'active' ? 'Trial aktiv' : t === 'expired' ? 'Trial udløbet' : 'Ingen trial'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Totalt', value: companies.length },
            { label: 'Premium', value: companies.filter(c => c.plan === 'premium').length },
            { label: 'Trial aktiv', value: companies.filter(c => c.trialActive).length },
            { label: 'Free', value: companies.filter(c => c.plan === 'free').length },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Virksomhed</th>
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Kategori</th>
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Plan</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Score (7d)</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Trend</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Nævnt%</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Valgt%</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Oprettet</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-zinc-600">
                      Ingen virksomheder matcher filteret.
                    </td>
                  </tr>
                )}
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{c.name}</div>
                      <div className="text-zinc-500">{c.domain}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{c.category}</td>
                    <td className="px-4 py-3">
                      <PlanBadge company={c} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.latestScore !== null ? (
                        <span className="text-violet-400 font-medium">{c.latestScore}/100</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <TrendBadge trend={c.trend} />
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {c.latestMentionRate !== null ? `${c.latestMentionRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-300">
                      {c.latestChosenRate !== null ? `${c.latestChosenRate}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">
                      {c.createdAt.split('T')[0]}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/${c.id}`)}
                        className="rounded bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition-colors"
                      >
                        Åbn →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3a] px-6 py-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold tracking-tight text-sm"><span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span></span>
            <span className="text-xs text-[#888898] ml-2">Admin</span>
          </div>
          <p className="text-xs text-[#888898]">© 2026 AI Institute ApS · CVR 44690615</p>
        </div>
      </footer>
    </div>
  );
}
