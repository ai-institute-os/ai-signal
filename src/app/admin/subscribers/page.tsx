'use client';

import { useState, useEffect } from 'react';

interface SubscriberRow {
  id: string;
  email: string;
  name: string;
  domain: string;
  plan: 'free' | 'premium';
  subscriberStatus: 'active' | 'paused' | 'unsubscribed' | 'pending';
  signupDate: string;
  latestReportAt: string | null;
  latestReportStatus: string | null;
  reportCount: number;
}

function PlanBadge({ plan }: { plan: 'free' | 'premium' }) {
  if (plan === 'premium') {
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

function StatusBadge({ status }: { status: SubscriberRow['subscriberStatus'] }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-emerald-500/20 border border-emerald-500/30', text: 'text-emerald-400', label: 'Aktiv' },
    paused: { bg: 'bg-yellow-500/20 border border-yellow-500/30', text: 'text-yellow-400', label: 'Pauset' },
    unsubscribed: { bg: 'bg-red-500/20 border border-red-500/30', text: 'text-red-400', label: 'Afmeldt' },
    pending: { bg: 'bg-zinc-700', text: 'text-zinc-400', label: 'Afventer' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={`rounded-full ${s.bg} px-2 py-0.5 text-xs ${s.text}`}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

export default function AdminSubscribersPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'premium'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused' | 'unsubscribed'>('all');
  const [actionState, setActionState] = useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({});

  const fetchSubscribers = async (adminSecret: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/subscribers', {
        headers: { 'x-admin-secret': adminSecret },
      });
      if (res.status === 401) {
        setError('Forkert admin-adgangskode.');
        return;
      }
      const d = await res.json();
      setSubscribers(d.subscribers ?? []);
      setAuthed(true);
      sessionStorage.setItem('admin_secret', adminSecret);
    } catch {
      setError('Kunne ikke hente data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_secret');
    if (stored) {
      setSecret(stored);
      fetchSubscribers(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secret) fetchSubscribers(secret);
  };

  const handleAction = async (companyId: string, action: 'trigger' | 'deactivate') => {
    const key = `${companyId}:${action}`;
    setActionState(prev => ({ ...prev, [key]: 'loading' }));
    try {
      const res = await fetch('/api/admin/subscribers', {
        method: 'POST',
        headers: {
          'x-admin-secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, companyId }),
      });
      if (!res.ok) {
        setActionState(prev => ({ ...prev, [key]: 'error' }));
        return;
      }
      setActionState(prev => ({ ...prev, [key]: 'done' }));
      if (action === 'deactivate') {
        setSubscribers(prev =>
          prev.map(s => s.id === companyId ? { ...s, subscriberStatus: 'unsubscribed' } : s)
        );
      }
      setTimeout(() => setActionState(prev => ({ ...prev, [key]: 'idle' })), 3000);
    } catch {
      setActionState(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const filtered = subscribers.filter(s => {
    if (filterPlan !== 'all' && s.plan !== filterPlan) return false;
    if (filterStatus !== 'all' && s.subscriberStatus !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.email.toLowerCase().includes(q) &&
          !s.name.toLowerCase().includes(q) &&
          !s.domain.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold tracking-tight text-lg leading-none">
                  <span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span>
                </span>
                <span className="text-xs text-zinc-500 font-medium">Admin</span>
              </div>
              <p className="text-xs text-zinc-500">Abonnenter — kun til intern brug</p>
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
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-lg leading-none">
              <span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span>
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-300">Admin — Abonnenter</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">{subscribers.length} abonnenter</span>
            <button
              onClick={() => fetchSubscribers(secret)}
              disabled={loading}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {loading ? 'Henter...' : 'Opdater'}
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_secret');
                setAuthed(false);
                setSubscribers([]);
              }}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Log ud
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Totalt', value: subscribers.length },
            { label: 'Aktive', value: subscribers.filter(s => s.subscriberStatus === 'active').length },
            { label: 'Premium', value: subscribers.filter(s => s.plan === 'premium').length },
            { label: 'Afmeldt', value: subscribers.filter(s => s.subscriberStatus === 'unsubscribed').length },
          ].map(card => (
            <div key={card.label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500 mb-1">{card.label}</div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søg på email, navn eller domæne..."
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
            {(['all', 'active', 'paused', 'unsubscribed'] as const).map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterStatus === st ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'Alle statusser' : st === 'active' ? 'Aktive' : st === 'paused' ? 'Pauset' : 'Afmeldt'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Abonnent</th>
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Plan</th>
                  <th className="px-4 py-3 text-left text-zinc-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Signup-dato</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Seneste rapport</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Rapporter</th>
                  <th className="px-4 py-3 text-right text-zinc-500 font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">
                      Ingen abonnenter matcher filteret.
                    </td>
                  </tr>
                )}
                {filtered.map(s => {
                  const triggerKey = `${s.id}:trigger`;
                  const deactivateKey = `${s.id}:deactivate`;
                  const triggerState = actionState[triggerKey] ?? 'idle';
                  const deactivateState = actionState[deactivateKey] ?? 'idle';

                  return (
                    <tr
                      key={s.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{s.email}</div>
                        <div className="text-zinc-500">{s.name} · {s.domain}</div>
                      </td>
                      <td className="px-4 py-3">
                        <PlanBadge plan={s.plan} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.subscriberStatus} />
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">
                        {formatDate(s.signupDate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.latestReportAt ? (
                          <span className="text-zinc-300">{formatDate(s.latestReportAt)}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300 font-medium">
                        {s.reportCount > 0 ? s.reportCount : <span className="text-zinc-600">0</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(s.id, 'trigger')}
                            disabled={triggerState === 'loading'}
                            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                              triggerState === 'done'
                                ? 'bg-green-600/30 text-green-400'
                                : triggerState === 'error'
                                ? 'bg-red-600/30 text-red-400'
                                : 'bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 disabled:opacity-50'
                            }`}
                          >
                            {triggerState === 'loading' ? 'Sender...' : triggerState === 'done' ? 'Sendt ✓' : triggerState === 'error' ? 'Fejl' : 'Send rapport'}
                          </button>
                          {s.subscriberStatus !== 'unsubscribed' && (
                            <button
                              onClick={() => {
                                if (!confirm(`Deaktiver ${s.email}? Dette sætter status til afmeldt.`)) return;
                                handleAction(s.id, 'deactivate');
                              }}
                              disabled={deactivateState === 'loading'}
                              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                deactivateState === 'done'
                                  ? 'bg-green-600/30 text-green-400'
                                  : deactivateState === 'error'
                                  ? 'bg-red-600/30 text-red-400'
                                  : 'bg-zinc-700 hover:bg-red-600/30 hover:text-red-400 text-zinc-400 disabled:opacity-50'
                              }`}
                            >
                              {deactivateState === 'loading' ? 'Deaktiverer...' : deactivateState === 'done' ? 'Deaktiveret ✓' : deactivateState === 'error' ? 'Fejl' : 'Deaktiver'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#2a2a3a] px-6 py-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold tracking-tight text-sm">
              <span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span>
            </span>
            <span className="text-xs text-[#888898] ml-2">Admin</span>
          </div>
          <p className="text-xs text-[#888898]">© 2026 AI Institute ApS · CVR 44690615</p>
        </div>
      </footer>
    </div>
  );
}
