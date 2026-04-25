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
    <div
      ref={ref}
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ border: '1px solid rgba(0,212,255,0.18)', background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00D4FF' }} />
          <span className="text-xs font-mono tracking-tight" style={{ color: 'rgba(0,212,255,0.8)' }}>AISignal · Live overvågning</span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>opdateret nu</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {[
          { value: score, label: 'AI-score', color: '#FFFFFF' },
          { value: mentions, label: 'nævnelser/md', color: '#00D4FF' },
          { value: `${(revenue / 1000).toFixed(0)}k`, label: 'est. omsætning', color: '#4ADE80' },
        ].map((stat, i) => (
          <div key={i} className="px-5 py-4 text-center" style={{ borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : undefined }}>
            <div className="text-2xl font-bold tabular-nums" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div>
        {rows.map((row, i) => (
          <div
            key={i}
            className="px-5 py-3 flex items-center justify-between gap-4 transition-colors duration-700"
            style={{
              borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
              background: i === activeRow ? 'rgba(0,212,255,0.04)' : undefined,
            }}
          >
            <span className="text-xs flex-1 truncate font-mono" style={{ color: 'rgba(255,255,255,0.55)' }}>&ldquo;{row.q}&rdquo;</span>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={row.mentioned
                  ? { background: 'rgba(0,212,255,0.12)', color: '#00D4FF' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
              >
                {row.mentioned ? 'Nævnt' : 'Ikke nævnt'}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={row.chosen
                  ? { background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
              >
                {row.chosen ? 'Valgt' : 'Ikke valgt'}
              </span>
              <span
                className="text-[10px] w-8 text-right font-mono"
                style={{ color: row.delta.startsWith('+') ? '#4ADE80' : 'rgba(255,255,255,0.25)' }}
              >
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
  const [heroEmail, setHeroEmail] = useState('');
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

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForm((f) => ({ ...f, email: heroEmail }));
    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
  };

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
    <div className="min-h-screen text-white" style={{ background: '#0A1628', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)' }}>

      {/* ── Nav ── */}
      <nav
        className="sticky top-0 z-50 px-6 py-4"
        style={{ background: 'rgba(10,22,40,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-baseline gap-0 text-xl font-bold tracking-tight">
            <span className="text-white">AI</span>
            <span style={{ color: '#00D4FF' }}>Signal</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pakker" className="text-sm hidden sm:block transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              Priser
            </a>
            <a href="/login" className="text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              Log ind
            </a>
            <a
              href="#signup"
              className="text-sm font-semibold rounded-lg px-4 py-2 transition-opacity"
              style={{ background: '#00D4FF', color: '#0A1628' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Tilmeld dig gratis
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium mb-8"
              style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00D4FF' }} />
              Realtids AI-overvågning · Ingen opkald
            </div>

            <h1
              className="text-4xl sm:text-5xl xl:text-[3.5rem] font-extrabold leading-[1.08] mb-6"
              style={{ letterSpacing: '-0.03em' }}
            >
              Ved du, hvad AI anbefaler{' '}
              <span style={{ color: '#00D4FF' }}>om din virksomhed?</span>
            </h1>

            <p className="text-lg mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Hver uge analyserer AISignal, hvordan ChatGPT, Gemini og Perplexity omtaler og anbefaler virksomheder i din kategori. Du får resultatet direkte i indbakken.
            </p>

            {/* Email signup form */}
            <form onSubmit={handleHeroSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="email"
                required
                placeholder="din@virksomhed.dk"
                value={heroEmail}
                onChange={(e) => setHeroEmail(e.target.value)}
                className="flex-1 rounded-xl px-4 py-3.5 text-sm font-medium focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
              />
              <button
                type="submit"
                className="rounded-xl px-6 py-3.5 text-sm font-bold whitespace-nowrap transition-opacity"
                style={{ background: '#00D4FF', color: '#0A1628' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Tilmeld gratis →
              </button>
            </form>

            <div className="flex items-center gap-5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
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

      {/* ── Problem strip ── */}
      <section className="py-20 px-6" style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Hvad er AISignal</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ letterSpacing: '-0.02em' }}>
            AI-modeller ændrer sig.<br />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Opdager du det?</span>
          </h2>
          <p className="text-lg mb-4 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            AI-modeller bruges i stigende grad til at finde og vælge leverandører, produkter og services. AISignal overvåger din position i det landskab — ugentligt, automatisk og uden at du behøver gøre noget.
          </p>
          <p className="text-base mb-14 max-w-xl mx-auto font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Du ved altid, om AI arbejder for dig eller imod dig.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            {[
              { icon: '⚔️', title: 'Konkurrenter vinder valget', body: 'ChatGPT anbefaler din konkurrent frem for dig — og du er den sidste til at vide det.' },
              { icon: '📉', title: 'Du mister omsætning lydløst', body: 'Leads der aldrig kommer. Kunder der vælger "den AI anbefalede". Ingen ved hvem eller hvornår.' },
              { icon: '🌫️', title: 'Ingen ved hvad der sker', body: 'Ingen tracking. Ingen alert. Ingen synlighed i, hvordan AI-modeller opfatter din virksomhed.' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl p-6"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="text-2xl mb-4">{item.icon}</div>
                <h3 className="font-semibold mb-2 text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Produktet</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Alt hvad du behøver for at vinde AI-synlighed
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Fire kernefunktioner der holder dig foran konkurrenterne.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#00D4FF' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: 'Ugentlig AI-overvågning',
                body: 'Automatisk analyse af din synlighed på tværs af de mest anvendte AI-modeller — hver uge, uden manuel indsats.',
                pills: ['ChatGPT', 'Gemini', 'Perplexity'],
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#00D4FF' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                ),
                title: 'Konsekvensformuleret indsigt',
                body: 'Du får ikke rå data. Du får en klar status: om din position er stærk, ustabil eller svag — og hvad det konkret betyder for din virksomhed.',
                pills: ['Stærk', 'Ustabil', 'Svag'],
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#00D4FF' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                ),
                title: 'Direkte i indbakken',
                body: 'Ingen dashboard at logge ind på. Rapporten ankommer som en læsbar, struktureret opdatering — klar til at handle på.',
                pills: ['E-mail', 'Ugentlig', 'Klar til brug'],
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#00D4FF' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                ),
                title: 'Sammenligning over tid',
                body: 'Se om din position forbedres eller forringes fra uge til uge. Fang ændringer, inden de påvirker din forretning.',
                pills: ['Trend', 'Historik', 'Uge for uge'],
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 flex flex-col gap-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.body}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {f.pills.map((p) => (
                    <span
                      key={p}
                      className="text-[11px] rounded-full px-2.5 py-0.5"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="py-20 px-6"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Sådan virker det</p>
            <h2 className="text-3xl font-bold" style={{ letterSpacing: '-0.02em' }}>
              Fra tilmelding til indsigt på 3 trin
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
            {[
              { n: '1', title: 'Tilmeld dig gratis', body: 'Indtast virksomhedsnavn, domæne og kategori. Ingen kreditkort. Ingen opkald.' },
              { n: '2', title: 'Vi overvåger AI\'erne', body: 'Vi sender strukturerede prompts til ChatGPT, Gemini og Perplexity og måler om du nævnes og vælges.' },
              { n: '3', title: 'Du får alert', body: 'Se din AI-synlighed over tid og få alerts ved vigtige ændringer — inden det rammer bundlinjen.' },
            ].map((s, i) => (
              <div key={s.n} className="relative">
                {i < 2 && (
                  <div
                    className="hidden sm:block absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px"
                    style={{ background: 'linear-gradient(to right, rgba(0,212,255,0.3), rgba(0,212,255,0.05))' }}
                  />
                )}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-5"
                  style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', color: '#00D4FF' }}
                >
                  {s.n}
                </div>
                <h3 className="font-semibold mb-2 text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pakker" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Priser</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Simpel og gennemsigtig prissætning
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Start gratis. Opgrader når du er klar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Gratis */}
            <div
              className="relative rounded-2xl p-8 flex flex-col gap-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div>
                <h3 className="font-bold text-xl text-white">Gratis</h3>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Kom i gang uden betaling</p>
                <p className="text-3xl font-extrabold text-white mt-5">0 kr<span className="text-base font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>/md</span></p>
              </div>
              <ul className="space-y-3 flex-1">
                {[
                  'Ugentlig AI-overvågningsrapport',
                  'Dækning af 3 AI-modeller',
                  'Direkte levering til din indbakke',
                  'Ingen kreditkort påkrævet',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <span className="mt-0.5 shrink-0" style={{ color: '#00D4FF' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#signup"
                className="block text-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                Tilmeld gratis →
              </a>
            </div>

            {/* AISignal Pro — Coming soon */}
            <div
              className="relative rounded-2xl p-8 flex flex-col gap-6"
              style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)', opacity: 0.85 }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="rounded-full px-3 py-0.5 text-[11px] font-bold"
                  style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)', color: '#00D4FF' }}
                >
                  Kommer snart
                </span>
              </div>
              <div>
                <h3 className="font-bold text-xl text-white">AISignal Pro</h3>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>For virksomheder der vil følge deres position tæt</p>
                <p className="text-base font-semibold text-white mt-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Pris annonceres ved launch</p>
              </div>
              <ul className="space-y-3 flex-1">
                {[
                  'Alt fra gratis',
                  'Dækning af alle større AI-modeller',
                  'Historisk sammenligning og trenddata',
                  'Prioriteret support',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <span className="mt-0.5 shrink-0" style={{ color: '#00D4FF' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#signup"
                className="block text-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors"
                style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.08)')}
              >
                Skriv dig op til early access →
              </a>
            </div>
          </div>

          {/* AIScore badge */}
          <div
            className="mt-8 rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left"
            style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)' }}
          >
            <div
              className="shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
              style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', color: '#00D4FF' }}
            >
              Fra AIScore
            </div>
            <div>
              <p className="font-semibold text-white">3 måneder gratis med AIScore-rapport</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Har du en AIScore-rapport? Aktiver AISignal med din rapport-kode og få 3 måneders gratis overvågning inkluderet.
              </p>
            </div>
            <a
              href="#signup"
              className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity"
              style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', color: '#00D4FF' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Aktiver nu →
            </a>
          </div>
        </div>
      </section>

      {/* ── Signup / CTA ── */}
      <section
        id="signup"
        className="py-24 px-6"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Kom i gang i dag</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ letterSpacing: '-0.02em' }}>
              Opret gratis overvågning
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>
              Ingen opkald. Ingen kreditkort. Resultater klar på under 2 minutter.
            </p>
          </div>

          <div
            className="rounded-2xl p-8"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Virksomhedsnavn', key: 'name' as const, placeholder: 'Eksempel ApS', type: 'text' },
                  { label: 'Domæne', key: 'domain' as const, placeholder: 'eksempel.dk', type: 'text' },
                ].map(({ label, key, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</label>
                    <input
                      type={type}
                      required
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                      onFocus={e => (e.currentTarget.style.border = '1px solid rgba(0,212,255,0.4)')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="dig@eksempel.dk"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(0,212,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Adgangskode</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 tegn"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(0,212,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Kategori', key: 'category' as const, options: CATEGORIES, placeholder: 'Vælg kategori...' },
                  { label: 'Land', key: 'country' as const, options: COUNTRIES, placeholder: 'Vælg land...' },
                ].map(({ label, key, options, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</label>
                    <select
                      required
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: form[key] ? '#fff' : 'rgba(255,255,255,0.35)' }}
                      onFocus={e => (e.currentTarget.style.border = '1px solid rgba(0,212,255,0.4)')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
                    >
                      <option value="" style={{ background: '#0A1628' }}>{placeholder}</option>
                      {options.map((o) => (
                        <option key={o} value={o} style={{ background: '#0A1628' }}>{o}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Konkurrenter <span className="font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>(valgfrit, op til 3)</span>
                </label>
                <div className="space-y-2">
                  {(['competitor1', 'competitor2', 'competitor3'] as const).map((key, i) => (
                    <input
                      key={key}
                      type="text"
                      placeholder={`Konkurrent ${i + 1}`}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                      onFocus={e => (e.currentTarget.style.border = '1px solid rgba(0,212,255,0.4)')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)')}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div
                  className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl px-6 py-3.5 text-sm font-bold transition-opacity disabled:opacity-50"
                style={{ background: '#00D4FF', color: '#0A1628' }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {loading ? 'Starter monitorering...' : 'Start gratis overvågning →'}
              </button>

              <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ingen kreditkort · Ingen binding · Resultater på under 2 min
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-12" style={{ background: '#0A1628', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto">
          {/* Footer CTA */}
          <div
            className="rounded-2xl px-8 py-10 text-center mb-12"
            style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}
          >
            <h3 className="text-2xl font-bold mb-3">Din AI-position ændrer sig — uanset om du følger med eller ej.</h3>
            <p className="mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Tilmeld AISignal gratis og få den ugentlige rapport direkte i indbakken.</p>
            <a
              href="#signup"
              className="inline-block rounded-xl px-8 py-3.5 text-sm font-bold transition-opacity"
              style={{ background: '#00D4FF', color: '#0A1628' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Tilmeld gratis — det tager under 30 sekunder
            </a>
          </div>

          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-0 text-lg font-bold tracking-tight">
                <span className="text-white">AI</span>
                <span style={{ color: '#00D4FF' }}>Signal</span>
              </div>
              <p className="text-xs leading-relaxed max-w-[200px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                AI-synlighedsmonitorering for virksomheder.<br />Udviklet af AI Institute ApS.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <div className="flex flex-col gap-2.5">
                <span className="font-semibold uppercase tracking-widest text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Produkt</span>
                <a href="#features" className="hover:text-white transition-colors">Funktioner</a>
                <a href="#pakker" className="hover:text-white transition-colors">Priser</a>
                <a href="/login" className="hover:text-white transition-colors">Log ind</a>
                <a href="mailto:hej@aisignal.dk" className="hover:text-white transition-colors">Kontakt</a>
              </div>
              <div className="flex flex-col gap-2.5">
                <span className="font-semibold uppercase tracking-widest text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>AI Institute-økosystemet</span>
                <a href="https://aiscore.dk" className="hover:text-white transition-colors">AIScore — AI-synlighedsanalyse</a>
                <a href="https://aisignal.dk" className="hover:text-white transition-colors">AISignal — Løbende monitorering</a>
                <a href="https://aiselect.dk" className="hover:text-white transition-colors">AISelect — Implementeringsretainer</a>
              </div>
            </div>
          </div>

          <div className="pt-6 text-xs text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
            © 2026 AI Institute ApS · CVR 44690615 · AISignal™ er et varemærke tilhørende AI Institute ApS
          </div>
        </div>
      </footer>
    </div>
  );
}
