'use client';

import { useState, useEffect } from 'react';

interface SignalSubscriber {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'confirmed';
  confirmed_at: string | null;
  created_at: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.split('T')[0];
}

export default function AdminSignalPage() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [subscribers, setSubscribers] = useState<SignalSubscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Newsletter form state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const fetchSubscribers = async (adminSecret: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/signal/subscribers', {
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

  const handleSendNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    if (!confirm(`Send nyhedsbrev til ${filtered.length} subscribers?\n\nEmne: ${subject}`)) return;

    setSendState('sending');
    setSendResult(null);
    try {
      const res = await fetch('/api/admin/signal/send-newsletter', {
        method: 'POST',
        headers: {
          'x-admin-secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject, body }),
      });
      const d = await res.json();
      if (!res.ok) {
        setSendState('error');
        setError(d.error ?? 'Fejl ved afsendelse.');
        return;
      }
      setSendResult(d);
      setSendState('done');
      setSubject('');
      setBody('');
      setTimeout(() => setSendState('idle'), 8000);
    } catch {
      setSendState('error');
    }
  };

  const filtered = subscribers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.email.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
  });

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-[#1E2A3A] bg-[#0D1526] p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold tracking-tight text-lg leading-none">
                  <span className="text-[#00D4FF]">AI</span><span className="text-[#E8E8F0]">Signal</span>
                </span>
                <span className="text-xs text-[#4A5568] font-medium">Admin</span>
              </div>
              <p className="text-xs text-[#4A5568]">Subscribers &amp; nyhedsbrev — kun til intern brug</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-[#6B7A90] mb-1">Admin-adgangskode</label>
                <input
                  type="password"
                  value={secret}
                  onChange={e => setSecret(e.target.value)}
                  className="w-full rounded-lg bg-[#0A0F1E] border border-[#1E2A3A] px-3 py-2 text-sm text-white placeholder-[#2D3A4A] focus:outline-none focus:border-[#00D4FF]"
                  placeholder="ADMIN_SECRET"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || !secret}
                className="w-full rounded-lg bg-[#00D4FF] hover:bg-[#00B8E0] disabled:opacity-40 py-2 text-sm font-medium text-[#0A0F1E] transition-colors"
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
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      {/* Nav */}
      <nav className="border-b border-[#1E2A3A] px-6 py-4 sticky top-0 bg-[#0A0F1E]/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-tight text-lg leading-none">
              <span className="text-[#00D4FF]">AI</span><span className="text-[#E8E8F0]">Signal</span>
            </span>
            <span className="text-[#2D3A4A]">/</span>
            <span className="text-sm text-[#6B7A90]">Admin — Subscribers &amp; nyhedsbrev</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#4A5568]">{subscribers.length} subscribers</span>
            <button
              onClick={() => fetchSubscribers(secret)}
              disabled={loading}
              className="rounded-lg bg-[#1E2A3A] hover:bg-[#243347] disabled:opacity-50 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {loading ? 'Henter...' : 'Opdater'}
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_secret');
                setAuthed(false);
                setSubscribers([]);
              }}
              className="rounded-lg bg-[#1E2A3A] hover:bg-[#243347] px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Log ud
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#1E2A3A] bg-[#0D1526] p-5">
            <div className="text-xs text-[#4A5568] mb-1">Bekræftede subscribers</div>
            <div className="text-3xl font-bold text-[#00D4FF]">{subscribers.length}</div>
          </div>
          <div className="rounded-xl border border-[#1E2A3A] bg-[#0D1526] p-5">
            <div className="text-xs text-[#4A5568] mb-1">Seneste tilmelding</div>
            <div className="text-lg font-semibold text-[#E8E8F0]">
              {subscribers[0] ? formatDate(subscribers[0].confirmed_at ?? subscribers[0].created_at) : '—'}
            </div>
          </div>
        </div>

        {/* Newsletter form */}
        <div className="rounded-xl border border-[#1E2A3A] bg-[#0D1526] p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E8E8F0] mb-0.5">Send nyhedsbrev</h2>
            <p className="text-xs text-[#4A5568]">Sendes til alle {subscribers.length} bekræftede subscribers via Resend</p>
          </div>
          <form onSubmit={handleSendNewsletter} className="space-y-3">
            <div>
              <label className="block text-xs text-[#6B7A90] mb-1">Emne</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-lg bg-[#0A0F1E] border border-[#1E2A3A] px-3 py-2 text-sm text-white placeholder-[#2D3A4A] focus:outline-none focus:border-[#00D4FF]"
                placeholder="f.eks. AI-nyt: Ugens vigtigste tendenser"
                disabled={sendState === 'sending'}
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B7A90] mb-1">Indhold</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={8}
                className="w-full rounded-lg bg-[#0A0F1E] border border-[#1E2A3A] px-3 py-2 text-sm text-white placeholder-[#2D3A4A] focus:outline-none focus:border-[#00D4FF] resize-y font-mono"
                placeholder="Skriv nyhedsbrevets indhold her..."
                disabled={sendState === 'sending'}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={sendState === 'sending' || !subject.trim() || !body.trim()}
                className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                  sendState === 'done'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                    : sendState === 'error'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                    : 'bg-[#00D4FF] hover:bg-[#00B8E0] text-[#0A0F1E]'
                }`}
              >
                {sendState === 'sending'
                  ? 'Sender...'
                  : sendState === 'done'
                  ? '✓ Sendt!'
                  : sendState === 'error'
                  ? 'Fejl — prøv igen'
                  : `Send til ${subscribers.length} subscribers`}
              </button>
              {sendResult && sendState === 'done' && (
                <span className="text-xs text-[#6B7A90]">
                  {sendResult.sent} sendt · {sendResult.failed} fejlet
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Subscriber table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#E8E8F0]">Subscriber-liste</h2>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søg på email eller navn..."
              className="rounded-lg bg-[#0D1526] border border-[#1E2A3A] px-3 py-1.5 text-xs text-white placeholder-[#2D3A4A] focus:outline-none focus:border-[#00D4FF] w-60"
            />
          </div>
          <div className="rounded-xl border border-[#1E2A3A] bg-[#0D1526] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E2A3A]">
                    <th className="px-4 py-3 text-left text-[#4A5568] font-medium">Email</th>
                    <th className="px-4 py-3 text-left text-[#4A5568] font-medium">Navn</th>
                    <th className="px-4 py-3 text-right text-[#4A5568] font-medium">Signup-dato</th>
                    <th className="px-4 py-3 text-right text-[#4A5568] font-medium">Bekræftet</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[#2D3A4A]">
                        Ingen subscribers matcher søgningen.
                      </td>
                    </tr>
                  )}
                  {filtered.map(s => (
                    <tr
                      key={s.id}
                      className="border-b border-[#1E2A3A]/50 hover:bg-[#1E2A3A]/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-[#E8E8F0]">{s.email}</td>
                      <td className="px-4 py-3 text-[#6B7A90]">{s.name || '—'}</td>
                      <td className="px-4 py-3 text-right text-[#6B7A90]">{formatDate(s.created_at)}</td>
                      <td className="px-4 py-3 text-right text-[#00D4FF]">{formatDate(s.confirmed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {search && (
            <p className="text-xs text-[#4A5568]">
              Viser {filtered.length} af {subscribers.length} subscribers
            </p>
          )}
        </div>
      </main>

      <footer className="border-t border-[#1E2A3A] px-6 py-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold tracking-tight text-sm">
              <span className="text-[#00D4FF]">AI</span><span className="text-[#E8E8F0]">Signal</span>
            </span>
            <span className="text-xs text-[#4A5568] ml-2">Admin</span>
          </div>
          <p className="text-xs text-[#4A5568]">© 2026 AI Institute ApS · CVR 44690615</p>
        </div>
      </footer>
    </div>
  );
}
