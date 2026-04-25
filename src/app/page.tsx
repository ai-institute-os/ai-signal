'use client';

import { useState, useEffect, useRef } from 'react';
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

function useCountUp(target: number, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function MonitoringPreview() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0);

  const score = useCountUp(78, 2000, visible);
  const mentions = useCountUp(142, 1600, visible);
  const revenue = useCountUp(340000, 2200, visible);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const rows = [
    { q: 'Bedste revisor i København?', mentioned: true, chosen: true, delta: '+4%' },
    { q: 'Regnskabshjælp til startup?', mentioned: true, chosen: false, delta: '–' },
    { q: 'Hvem anbefaler ChatGPT til skat?', mentioned: false, chosen: false, delta: '–' },
    { q: 'Revisorfirma med ESG-erfaring?', mentioned: true, chosen: true, delta: '+2%' },
  ];

  const activeRow = tick % rows.length;

  return (
    <div ref={ref} className="rounded-2xl border border-zinc-700/60 bg-[#13131a] overflow-hidden shadow-2xl shadow-violet-950/40">
      <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs text-zinc-400 font-mono tracking-tight">AISignal · Live overvågning</span>
        </div>
        <span className="text-xs text-zinc-600 font-mono">opdateret nu</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800">
        <div className="px-5 py-4 text-center">
          <div className="text-2xl font-bold text-white tabular-nums">{score}</div>
          <div className="text-xs text-zinc-500 mt-0.5">AI-score</div>
        </div>
        <div className="px-5 py-4 text-center">
          <div className="text-2xl font-bold text-violet-400 tabular-nums">{mentions}</div>
          <div className="text-xs text-zinc-500 mt-0.5">nævnelser/måned</div>
        </div>
        <div className="px-5 py-4 text-center">
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">{(revenue / 1000).toFixed(0)}k</div>
          <div className="text-xs text-zinc-500 mt-0.5">est. omsætning</div>
        </div>
      </div>

      <div className="divide-y divide-zinc-800/60">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`px-5 py-3 flex items-center justify-between gap-4 transition-colors duration-700 ${i === activeRow ? 'bg-violet-500/5' : ''}`}
          >
            <span className="text-xs text-zinc-400 flex-1 truncate font-mono">&ldquo;{row.q}&rdquo;</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${row.mentioned ? 'bg-violet-500/20 text-violet-300' : 'bg-zinc-800 text-zinc-600'}`}>
                {row.mentioned ? 'Nævnt' : 'Ikke nævnt'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${row.chosen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-600'}`}>
                {row.chosen ? 'Valgt' : 'Ikke valgt'}
              </span>
              <span className={`text-[10px] w-8 text-right font-mono ${row.delta.startsWith('+') ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {row.delta}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
    <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0]">
      {/* Nav */}
      <nav className="border-b border-[#2a2a3a] px-6 py-4 sticky top-0 z-50 bg-[rgba(10,10,15,0.92)] backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <span className="font-bold text-base tracking-tight">
              <span className="text-violet-400">AI</span>Signal
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pakker" className="text-xs text-[#888898] hover:text-[#e8e8f0] transition-colors hidden sm:block">Priser</a>
            <a href="/login" className="text-xs text-[#888898] hover:text-[#e8e8f0] transition-colors">Log ind</a>
            <a
              href="#signup"
              className="text-xs rounded-lg px-3 py-1.5 font-semibold text-white transition-colors"
              style={{ background: '#6c63ff' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#5a52d5')}
              onMouseLeave={e => (e.currentTarget.style.background = '#6c63ff')}
            >
              Start gratis
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[1100px] mx-auto px-6 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1 text-xs text-violet-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Realtids AI-overvågning · Ingen opkald
            </div>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6" style={{ letterSpacing: '-0.03em' }}>
              Overvåg hvad AI siger<br />
              om din virksomhed —{' '}
              <span className="text-violet-400">i realtid</span>
            </h1>
            <p className="text-lg text-[#888898] leading-relaxed mb-4">
              Dine kunder spørger ChatGPT, Gemini og Perplexity om anbefalinger. Hvornår holdt AI op med at vælge dig?
            </p>
            <p className="text-base text-zinc-500 leading-relaxed mb-10">
              AISignal overvåger automatisk om din virksomhed nævnes og vælges — og giver dig alert inden du mærker det på bundlinjen.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#signup"
                className="inline-flex items-center justify-center rounded-xl px-7 py-3.5 font-semibold text-white text-sm transition-colors"
                style={{ background: '#6c63ff' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#5a52d5')}
                onMouseLeave={e => (e.currentTarget.style.background = '#6c63ff')}
              >
                Start gratis →
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-[#2a2a3a] hover:border-[#6c63ff] hover:text-[#e8e8f0] transition-colors px-7 py-3.5 font-medium text-[#888898] text-sm"
              >
                Se hvordan det virker
              </a>
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs text-zinc-600">
              <span>✓ Ingen kreditkort</span>
              <span>✓ Resultater på 2 min</span>
              <span>✓ Ingen binding</span>
            </div>
          </div>
          <div className="lg:pl-4">
            <MonitoringPreview />
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section className="bg-[#13131a] border-y border-[#2a2a3a] py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-4">Problemet</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 leading-tight" style={{ letterSpacing: '-0.02em' }}>
            AI-anbefalinger ændrer sig.<br />
            <span className="text-[#888898]">Opdager du det?</span>
          </h2>
          <p className="text-[#888898] text-lg mb-14 max-w-2xl mx-auto">
            AI-modeller opdaterer løbende hvem de anbefaler. Det sker uden varsel. Og det koster omsætning.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: '⚔️',
                title: 'Konkurrenter vinder valget',
                body: 'ChatGPT anbefaler din konkurrent frem for dig — og du er den sidste til at vide det.',
              },
              {
                icon: '📉',
                title: 'Du mister omsætning lydløst',
                body: 'Leads der aldrig kommer. Kunder der vælger "den AI anbefalede". Ingen ved hvem eller hvornår.',
              },
              {
                icon: '🌫️',
                title: 'Ingen ved hvad der sker',
                body: 'Ingen tracking. Ingen alert. Ingen synlighed i, hvordan AI-modeller opfatter din virksomhed.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-[#2a2a3a] bg-[#0a0a0f] p-6">
                <div className="text-2xl mb-4">{item.icon}</div>
                <h3 className="font-semibold text-[#e8e8f0] mb-2">{item.title}</h3>
                <p className="text-sm text-[#888898] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-4">Produktet</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Alt hvad du behøver for at vinde AI-synlighed
            </h2>
            <p className="text-[#888898] max-w-xl mx-auto">Tre kernefunktioner der holder dig foran konkurrenterne.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: 'Realtids AI-overvågning',
                body: 'Vi tester løbende ChatGPT, Gemini og Perplexity med strukturerede prompts i din branche. Du ser resultater live — ikke uger gamle snapshots.',
                pills: ['ChatGPT', 'Gemini', 'Perplexity'],
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                ),
                title: 'Nævnt vs. Valgt-analyse',
                body: 'Det er ikke nok at blive nævnt. AISignal skiller "nævnt" fra "valgt" — og viser præcis hvilke prompts der ender med et konkurrentvalg.',
                pills: ['Nævnt', 'Valgt', 'Fravalgt'],
              },
              {
                icon: (
                  <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                ),
                title: 'Estimeret omsætningskonsekvens',
                body: 'Vi modellerer hvad din AI-synlighed er værd i kroner — og hvad du mister hvis scoren falder. Giv det et tal ledelsen forstår.',
                pills: ['DKK', 'Trend', 'Alert'],
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-[#2a2a3a] bg-[#13131a] p-7 flex flex-col gap-5">
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-[#e8e8f0] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#888898] leading-relaxed">{f.body}</p>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {f.pills.map((p) => (
                    <span key={p} className="text-[11px] rounded-full bg-zinc-800 border border-[#2a2a3a] px-2.5 py-0.5 text-[#888898]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pakker / Pricing */}
      <section id="pakker" className="bg-[#13131a] border-y border-[#2a2a3a] py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-4">Priser</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Vælg den pakke der passer dig
            </h2>
            <p className="text-[#888898] max-w-lg mx-auto">Alle pakker inkluderer realtids AI-overvågning. Skaler op når du vokser.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: 'Lille',
                subtitle: 'Kom godt i gang',
                price: 'Fra 299 kr/md',
                highlight: false,
                features: [
                  '1 virksomhed overvåget',
                  'ChatGPT + Gemini',
                  'Op til 50 prompts/md',
                  'Ugentlig rapport',
                  'E-mail alerts',
                  '1 konkurrent tracked',
                ],
                cta: 'Start gratis',
                href: '#signup',
              },
              {
                name: 'Mellem',
                subtitle: 'Til ambitiøse virksomheder',
                price: 'Fra 699 kr/md',
                highlight: true,
                features: [
                  '1 virksomhed overvåget',
                  'ChatGPT + Gemini + Perplexity',
                  'Op til 200 prompts/md',
                  'Daglig rapport',
                  'E-mail + Slack alerts',
                  'Op til 5 konkurrenter tracked',
                  'Omsætningsestimering',
                  'Nævnt vs. Valgt-analyse',
                ],
                cta: 'Start gratis',
                href: '#signup',
              },
              {
                name: 'Stor',
                subtitle: 'Til bureauer og agencies',
                price: 'Fra 1.999 kr/md',
                highlight: false,
                features: [
                  'Op til 10 virksomheder',
                  'Alle AI-modeller',
                  'Ubegrænsede prompts',
                  'Realtids dashboard',
                  'Dedikeret alerts',
                  'Ubegrænsede konkurrenter',
                  'Omsætningsestimering',
                  'White-label rapport',
                  'API adgang',
                ],
                cta: 'Kontakt os',
                href: 'mailto:hej@aisignal.dk',
              },
            ].map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-2xl border p-7 flex flex-col gap-6 ${
                  pkg.highlight
                    ? 'border-violet-500/60 bg-violet-950/20 shadow-lg shadow-violet-950/30'
                    : 'border-[#2a2a3a] bg-[#0a0a0f]'
                }`}
              >
                {pkg.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full px-3 py-0.5 text-[11px] font-bold text-white" style={{ background: '#6c63ff' }}>
                      Mest populær
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-[#e8e8f0]">{pkg.name}</h3>
                  <p className="text-sm text-[#888898] mt-0.5">{pkg.subtitle}</p>
                  <p className="text-2xl font-bold text-[#e8e8f0] mt-4">{pkg.price}</p>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className="text-violet-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={pkg.href}
                  className={`block text-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                    pkg.highlight
                      ? 'text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-[#2a2a3a]'
                  }`}
                  style={pkg.highlight ? { background: '#6c63ff' } : undefined}
                  onMouseEnter={pkg.highlight ? (e) => (e.currentTarget.style.background = '#5a52d5') : undefined}
                  onMouseLeave={pkg.highlight ? (e) => (e.currentTarget.style.background = '#6c63ff') : undefined}
                >
                  {pkg.cta} →
                </a>
              </div>
            ))}
          </div>

          {/* AIScore badge */}
          <div className="mt-10 rounded-2xl border border-violet-500/30 bg-violet-950/10 px-8 py-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="shrink-0 rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-2 text-violet-300 font-bold text-sm">
              Fra AIScore
            </div>
            <div>
              <p className="font-semibold text-[#e8e8f0]">3 måneder gratis med AIScore-rapport</p>
              <p className="text-sm text-[#888898] mt-1">
                Har du en AIScore-rapport? Aktiver AISignal med din rapport-kode og få 3 måneders gratis overvågning inkluderet.
              </p>
            </div>
            <a
              href="#signup"
              className="shrink-0 rounded-xl border border-violet-500/40 hover:border-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors px-5 py-2.5 text-sm font-semibold text-violet-300"
            >
              Aktiver nu →
            </a>
          </div>
        </div>
      </section>

      {/* CTA / Signup */}
      <section id="signup" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-4">Kom i gang i dag</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Opret gratis overvågning
            </h2>
            <p className="text-[#888898] max-w-md mx-auto">
              Ingen opkald. Ingen kreditkort. Resultater klar på under 2 minutter.
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border border-[#2a2a3a] bg-[#13131a] p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Virksomhedsnavn</label>
                    <input
                      type="text"
                      required
                      placeholder="Eksempel ApS"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                      className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="dig@eksempel.dk"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                    className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
                    <select
                      required
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                      className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
                    Konkurrenter <span className="text-zinc-600 font-normal">(valgfrit, op til 3)</span>
                  </label>
                  <div className="space-y-2">
                    {(['competitor1', 'competitor2', 'competitor3'] as const).map((key, i) => (
                      <input
                        key={key}
                        type="text"
                        placeholder={`Konkurrent ${i + 1}`}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        className="w-full rounded-lg border border-[#2a2a3a] bg-zinc-900 px-4 py-2.5 text-sm text-[#e8e8f0] placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    ))}
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
                  className="w-full rounded-xl disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3.5 text-sm font-semibold text-white transition-colors"
                  style={{ background: loading ? undefined : '#6c63ff' }}
                >
                  {loading ? 'Starter monitorering...' : 'Start gratis overvågning →'}
                </button>

                <p className="text-center text-xs text-zinc-600">
                  Ingen kreditkort · Ingen binding · Resultater på under 2 min
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#2a2a3a] bg-[#13131a] py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-4">Sådan fungerer det</p>
            <h2 className="text-2xl font-bold" style={{ letterSpacing: '-0.02em' }}>Tre trin fra tilmelding til indsigt</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Tilmeld dig', body: 'Indtast virksomhedsnavn, domæne og kategori. Ingen kreditkort. Ingen opkald.' },
              { n: '2', title: 'AI testes automatisk', body: 'Vi sender strukturerede prompts til ChatGPT, Gemini og Perplexity og måler om du nævnes og vælges.' },
              { n: '3', title: 'Følg din score', body: 'Se din AI-synlighed over tid og få alerts ved vigtige ændringer — inden det rammer bundlinjen.' },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-2 text-[#e8e8f0]">{s.title}</h3>
                <p className="text-sm text-[#888898] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#2a2a3a] bg-[#0a0a0f] px-6 py-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold tracking-tight">
                <span className="text-violet-400">AI</span>Signal
              </span>
              <p className="text-xs text-[#888898] leading-relaxed max-w-[220px]">
                AI-synlighedsmonitorering for virksomheder.<br />Udviklet af AI Institute ApS.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4 text-xs text-[#888898]">
              <div className="flex flex-col gap-2">
                <span className="font-semibold uppercase tracking-widest text-zinc-600">Produkt</span>
                <a href="/login" className="hover:text-[#e8e8f0] transition-colors">Log ind</a>
                <a href="mailto:hej@aisignal.dk" className="hover:text-[#e8e8f0] transition-colors">Kontakt</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold uppercase tracking-widest text-zinc-600">AI Institute-økosystemet</span>
                <a href="https://aiscore.dk" className="hover:text-[#e8e8f0] transition-colors">AIScore — AI-synlighedsanalyse</a>
                <a href="https://aisignal.dk" className="hover:text-[#e8e8f0] transition-colors">AISignal — Løbende monitorering</a>
                <a href="https://aiselect.dk" className="hover:text-[#e8e8f0] transition-colors">AISelect — Implementeringsretainer</a>
              </div>
            </div>
          </div>
          <div className="border-t border-[#2a2a3a] pt-6 text-xs text-zinc-600 text-center">
            © 2026 AI Institute ApS · CVR 44690615 · AISignal™ er et varemærke tilhørende AI Institute ApS
          </div>
        </div>
      </footer>
    </div>
  );
}
