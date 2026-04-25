'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Konsulentvirksomhed', 'Softwarevirksomhed', 'Marketing/Reklame', 'Advokatfirma',
  'Revisionsfirma', 'Rekruttering/HR', 'Ingeniør/Teknisk rådgivning', 'Byggeri/Ejendom',
  'Sundhed/Klinik', 'E-handel/Webshop', 'Restauration/Catering', 'Produktion/Industri',
  'Transport/Logistik', 'Finansielle ydelser', 'Anden virksomhed',
];

const COUNTRIES = [
  'Danmark', 'Sverige', 'Norge', 'Finland', 'Tyskland', 'UK', 'Holland',
  'Belgien', 'Frankrig', 'Spanien', 'Andet',
];

interface CompanyData {
  id: string;
  name: string;
  domain: string;
  email: string;
  category: string;
  country: string;
  competitors: string[];
  aisignal_plan: 'free' | 'premium';
  trial_ends_at: string | null;
  products_purchased: string[];
  created_at: string;
}

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', domain: '', email: '', category: '', country: '',
    competitor1: '', competitor2: '', competitor3: '',
  });

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then((r) => {
        if (r.status === 404) { router.push('/'); return null; }
        return r.json();
      })
      .then((d: CompanyData | null) => {
        if (!d) return;
        setCompany(d);
        setForm({
          name: d.name,
          domain: d.domain,
          email: d.email,
          category: d.category,
          country: d.country,
          competitor1: d.competitors[0] ?? '',
          competitor2: d.competitors[1] ?? '',
          competitor3: d.competitors[2] ?? '',
        });
      })
      .catch(() => setError('Kunne ikke hente indstillinger.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    const competitors = [form.competitor1, form.competitor2, form.competitor3]
      .map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          domain: form.domain.trim().toLowerCase(),
          email: form.email.trim().toLowerCase(),
          category: form.category,
          country: form.country,
          competitors,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Noget gik galt.');
        return;
      }
      const updated: CompanyData = await res.json();
      setCompany(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Netværksfejl. Prøv igen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Indlæser indstillinger...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400 text-sm">{error || 'Virksomhed ikke fundet.'}</div>
      </div>
    );
  }

  const trialActive = company.aisignal_plan === 'premium' && !!company.trial_ends_at && new Date(company.trial_ends_at) > new Date();
  const trialDaysLeft = trialActive && company.trial_ends_at
    ? Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80">
              <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center text-xs font-bold">AI</div>
              <span className="font-semibold tracking-tight">AISignal</span>
            </button>
            <span className="text-zinc-600">/</span>
            <button onClick={() => router.push(`/dashboard/${id}`)} className="text-sm text-zinc-300 hover:text-white">
              {company.name}
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">Indstillinger</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/dashboard/${id}/upgrade`)}
              className="rounded-lg border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 px-4 py-1.5 text-xs font-medium transition-colors"
            >
              Opgrader
            </button>
            <button
              onClick={() => router.push(`/dashboard/${id}`)}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 text-xs font-medium transition-colors"
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Plan status */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Fakturering & plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                {trialActive ? 'AISignal Premium' : 'AISignal Gratis'}
              </div>
              {trialActive && trialDaysLeft !== null && (
                <div className="text-xs text-zinc-400 mt-1">
                  Gratis premium i <span className="text-violet-400 font-medium">{trialDaysLeft} dage</span> endnu
                  {company.trial_ends_at && ` (udløber ${company.trial_ends_at.split('T')[0]})`}
                </div>
              )}
              {!trialActive && (
                <div className="text-xs text-zinc-500 mt-1">Grundlæggende AI-monitorering inkluderet</div>
              )}
            </div>
            {!trialActive && (
              <button
                onClick={() => router.push(`/dashboard/${id}/upgrade`)}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Se pakker →
              </button>
            )}
            {trialActive && (
              <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs text-violet-400">
                Premium aktiv
              </span>
            )}
          </div>
          {company.products_purchased.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 mb-2">Aktiverede produkter</div>
              <div className="flex flex-wrap gap-2">
                {company.products_purchased.map((p) => (
                  <span key={p} className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs text-zinc-300">
                    {p === 'aiscore' ? 'AIScore' : p === 'aiselect' ? 'AISelect' : p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Company info form */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-6">Virksomhedsoplysninger</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Virksomhedsnavn</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Domæne</label>
                <input
                  type="text"
                  required
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Virksomhedskategori</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Vælg kategori...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Land</label>
                <select
                  required
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Vælg land...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Konkurrenter <span className="text-zinc-500 font-normal">(valgfrit, op til 3)</span>
              </label>
              <div className="space-y-2">
                {(['competitor1', 'competitor2', 'competitor3'] as const).map((k, i) => (
                  <input
                    key={k}
                    type="text"
                    placeholder={`Konkurrent ${i + 1}`}
                    value={form[k]}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                Indstillinger gemt.
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {saving ? 'Gemmer...' : 'Gem ændringer'}
              </button>
            </div>
          </form>
        </section>

        {/* Account info */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Konto</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between text-zinc-400">
              <dt>Konto-ID</dt>
              <dd className="font-mono text-xs text-zinc-500">{company.id}</dd>
            </div>
            <div className="flex justify-between text-zinc-400">
              <dt>Oprettet</dt>
              <dd className="text-zinc-500">{company.created_at.split('T')[0]}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
