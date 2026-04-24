'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Konsulentvirksomhed',
  'Softwarevirksomhed',
  'Marketing/Reklame',
  'Advokatfirma',
  'Revisionsfirma',
  'Rekruttering/HR',
  'Ingeniør/Teknisk rådgivning',
  'Byggeri/Ejendom',
  'Sundhed/Klinik',
  'E-handel/Webshop',
  'Restauration/Catering',
  'Produktion/Industri',
  'Transport/Logistik',
  'Finansielle ydelser',
  'Anden virksomhed',
];

const COUNTRIES = [
  'Danmark',
  'Sverige',
  'Norge',
  'Finland',
  'Tyskland',
  'UK',
  'Holland',
  'Belgien',
  'Frankrig',
  'Spanien',
  'Andet',
];

export default function LandingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    domain: '',
    email: '',
    category: '',
    country: '',
    password: '',
    competitor1: '',
    competitor2: '',
    competitor3: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password.length < 8) {
      setError('Adgangskode skal være mindst 8 tegn.');
      setLoading(false);
      return;
    }

    try {
      const competitors = [form.competitor1, form.competitor2, form.competitor3]
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          domain: form.domain,
          email: form.email,
          category: form.category,
          country: form.country,
          password: form.password,
          competitors,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Noget gik galt. Prøv igen.');
        return;
      }

      // Trigger first monitoring run
      await fetch('/api/monitor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: data.companyId }),
      });

      router.push(`/dashboard/${data.companyId}`);
    } catch {
      setError('Netværksfejl. Tjek din forbindelse og prøv igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center text-xs font-bold">AI</div>
            <span className="font-semibold text-white tracking-tight">AISignal</span>
          </div>
          <a href="/login" className="text-xs text-zinc-400 hover:text-white transition-colors">Log ind</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs text-violet-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Automatisk • Løbende • Ingen opkald
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
          Se hvad AI siger<br />
          <span className="text-violet-400">om din virksomhed</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-zinc-400 leading-relaxed mb-12">
          Når dine kunder spørger ChatGPT, Gemini eller Perplexity — bliver din virksomhed nævnt? Valgt?
          AISignal overvåger din AI-synlighed automatisk og giver dig alerts når noget ændrer sig.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {['Nævnt vs. valgt', 'Konkurrentbevægelser', 'Score-trend over tid', 'Automatiske alerts', 'Ingen binding'].map((f) => (
            <span key={f} className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm text-zinc-300">
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* Signup form */}
      <section id="signup" className="max-w-xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-xl font-semibold mb-1">Opret gratis overvågning</h2>
          <p className="text-sm text-zinc-400 mb-6">Ingen opkald. Resultater klar på under 2 minutter.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Virksomhedsnavn</label>
              <input
                type="text"
                required
                placeholder="Eksempel ApS"
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
                placeholder="eksempel.dk"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-mail</label>
              <input
                type="email"
                required
                placeholder="dig@eksempel.dk"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Adgangskode</label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="Minimum 8 tegn"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Konkurrenter <span className="text-zinc-500 font-normal">(valgfrit, op til 3)</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Konkurrent 1"
                  value={form.competitor1}
                  onChange={(e) => setForm({ ...form, competitor1: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  placeholder="Konkurrent 2"
                  value={form.competitor2}
                  onChange={(e) => setForm({ ...form, competitor2: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <input
                  type="text"
                  placeholder="Konkurrent 3"
                  value={form.competitor3}
                  onChange={(e) => setForm({ ...form, competitor3: e.target.value })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-colors"
            >
              {loading ? 'Starter monitorering...' : 'Start gratis overvågning →'}
            </button>
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800 bg-zinc-900/50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-12">Sådan fungerer det</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Tilmeld dig', body: 'Indtast virksomhedsnavn, domæne og kategori. Ingen kreditkort. Ingen opkald.' },
              { n: '2', title: 'AI testes automatisk', body: 'Vi sender strukturerede prompts til GPT og måler om du nævnes og vælges.' },
              { n: '3', title: 'Følg din score', body: 'Se din AI-synlighed over tid og få alerts ved vigtige ændringer.' },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-xs text-zinc-600">
        © 2026 AISignal · AI-synlighedsmonitorering
      </footer>
    </div>
  );
}
