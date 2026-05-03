'use client';

import { useState, useEffect, useRef } from 'react';

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

const FAQ_ITEMS = [
  {
    q: 'Er det virkelig gratis?',
    a: 'Ja. Den gratis plan kræver hverken kreditkort eller binding. Du angiver din virksomhed og modtager ugentlige AI-overvågningsrapporter automatisk. Pro-funktioner lanceres på et tidspunkt — men gratis er gratis.',
  },
  {
    q: 'Hvad gør InsideAI, som jeg ikke selv kan?',
    a: 'Du kan spørge ChatGPT om din virksomhed én gang. InsideAI gør det systematisk og ugentligt — på tværs af tre AI-modeller, med de spørgsmål rigtige brugere stiller. Og sender dig resultatet uden at du løfter en finger.',
  },
  {
    q: 'Hvad kan jeg egentlig bruge det til?',
    a: 'Du ser om AI anbefaler din virksomhed eller en konkurrent. Du opdager om din position forbedres eller forringes fra uge til uge. Og du kan reagere, inden det påvirker dine leads.',
  },
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
          <span className="text-xs font-mono tracking-tight" style={{ color: 'rgba(0,212,255,0.8)' }}>InsideAI · Live overvågning</span>
        </div>
        <span className="text-xs font-mono rounded px-1.5 py-0.5" style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Demo-data</span>
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

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
}

export default function LandingPage() {
  const [heroEmail, setHeroEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [form, setForm] = useState({
    name: '',
    domain: '',
    email: '',
    category: '',
    country: '',
    competitor1: '',
    competitor2: '',
    competitor3: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForm((f) => ({ ...f, email: heroEmail }));
    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
          competitors,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Noget gik galt. Prøv igen.');
        return;
      }

      setSubmittedEmail(form.email);
      setSubmitted(true);
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
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-0 text-xl font-bold tracking-tight shrink-0">
            <span className="text-white">AI</span>
            <span style={{ color: '#00D4FF' }}>Signal</span>
          </div>

          {/* ── Article search bar ── */}
          <div ref={searchRef} className="relative hidden md:block flex-1 max-w-xs">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                placeholder="Søg i artikler…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
              />
              {searchLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-white/30 border-t-white/70 rounded-full animate-spin" />
              )}
            </div>

            {searchOpen && (
              <div
                className="absolute top-full mt-1.5 left-0 right-0 rounded-xl overflow-hidden shadow-2xl z-50"
                style={{ background: '#0F1E35', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingen artikler fundet</div>
                ) : (
                  searchResults.map(r => (
                    <a
                      key={r.id}
                      href={`/artikler/${r.slug}`}
                      className="block px-4 py-3 transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,212,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    >
                      <div className="text-xs font-semibold truncate" style={{ color: '#fff' }}>{r.title}</div>
                      <div className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.excerpt}</div>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-6 shrink-0">
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
              Smarte AI-signaler til{' '}
              <span style={{ color: '#00D4FF' }}>din danske virksomhed</span>
            </h1>

            <p className="text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              InsideAI giver dig handlingsbar AI-indsigt, så du kan træffe bedre beslutninger – uden teknisk baggrund.
            </p>

            {/* 3 value points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[
                { icon: '📊', title: 'Realtids-indsigt', body: 'Se præcis, hvad der sker i din branche – opdateret dagligt og filtreret til din virksomhed.' },
                { icon: '🤖', title: 'AI-anbefalinger', body: 'Få konkrete handlingsforslag baseret på din situation – ikke generiske råd.' },
                { icon: '🔒', title: 'Dansk og sikkert', body: 'Dine data behandles i overensstemmelse med GDPR. Ingen overraskelser, kun tryghed.' },
              ].map((v) => (
                <div
                  key={v.title}
                  className="rounded-xl p-4 flex flex-col gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="text-lg">{v.icon}</div>
                  <p className="text-xs font-semibold text-white">{v.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{v.body}</p>
                </div>
              ))}
            </div>

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
                Prøv InsideAI gratis →
              </button>
            </form>

            <div className="flex items-center gap-4 flex-wrap mb-2">
              <div className="flex items-center gap-5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                <span>✓ Ingen kreditkort</span>
                <span>✓ Resultater på 2 min</span>
                <span>✓ Ingen binding</span>
              </div>
              <a
                href="#features"
                className="text-xs transition-colors"
                style={{ color: 'rgba(0,212,255,0.65)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#00D4FF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0,212,255,0.65)')}
              >
                Se, hvordan det virker →
              </a>
            </div>

            <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <div className="flex -space-x-1">
                {['#3B82F6','#10B981','#8B5CF6'].map((c, i) => (
                  <div key={i} className="w-5 h-5 rounded-full border-2 shrink-0" style={{ background: c, borderColor: '#0A1628' }} />
                ))}
              </div>
              <span>Mere end <strong className="text-white">500 danske SMVer</strong> bruger allerede InsideAI</span>
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Hvad er InsideAI</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ letterSpacing: '-0.02em' }}>
            AI-modeller ændrer sig.<br />
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Opdager du det?</span>
          </h2>
          <p className="text-lg mb-4 max-w-2xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            AI-modeller bruges i stigende grad til at finde og vælge leverandører, produkter og services. InsideAI overvåger din position i det landskab — ugentligt, automatisk og uden at du behøver gøre noget.
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

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            {[
              { quote: 'Vi opdagede at Gemini anbefalede en konkurrent i 7 uger — nu ved vi det inden det sker igen.', name: 'Søren J.', role: 'Revisionsfirma' },
              { quote: 'Jeg troede vi var synlige for AI. InsideAI viste at vi slet ikke blev nævnt på de vigtigste spørgsmål.', name: 'Mette K.', role: 'Konsulentvirksomhed' },
              { quote: 'På to uger gik vi fra 0 til 3 ud af 4 anbefalinger — og vi kan se præcis hvad der ændrede sig.', name: 'Lars B.', role: 'Softwarevirksomhed' },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-xl p-6 flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <p className="text-sm leading-relaxed italic flex-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(0,212,255,0.15)', color: '#00D4FF' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.role}</p>
                  </div>
                </div>
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
              Tre ting du får, som du ikke kan få andre steder
            </h2>
            <p className="max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Automatisk, ugentligt og direkte i din indbakke.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                icon: '🔍',
                title: 'Ugentlig AI-scanning',
                body: 'Du ser om din virksomhed nævnes og vælges, når rigtige brugere stiller spørgsmål til ChatGPT, Gemini og Perplexity.',
                pills: ['ChatGPT', 'Gemini', 'Perplexity'],
              },
              {
                icon: '📬',
                title: 'Rapport i indbakken',
                body: 'Ingen login, ingen dashboard. Resultatet ankommer som en læsbar rapport — klar til at handle på.',
                pills: ['E-mail', 'Ugentlig', 'Ingen login'],
              },
              {
                icon: '📊',
                title: 'Position over tid',
                body: 'Se om du vinder eller taber terræn uge for uge — inden det kan mærkes på bundlinjen.',
                pills: ['Trend', 'Historik', 'Uge for uge'],
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl p-6 flex flex-col gap-5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="text-3xl">{f.icon}</div>
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

      {/* ── FAQ ── */}
      <section
        className="py-24 px-6"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold" style={{ letterSpacing: '-0.02em' }}>
              Ofte stillede spørgsmål
            </h2>
          </div>
          <div
            className="flex flex-col"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left py-5 flex items-center justify-between gap-4"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1.25rem 0' }}
                >
                  <span className="font-medium text-white">{item.q}</span>
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(0,212,255,0.1)',
                      border: '1px solid rgba(0,212,255,0.25)',
                      color: '#00D4FF',
                      transform: openFaq === i ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
                {openFaq === i && (
                  <div className="pb-5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {item.a}
                  </div>
                )}
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
              Start gratis. Ingen overraskelser.
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Gratis er gratis. Pro er til dem, der vil vide mere end bare om de nævnes.
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
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Ingen kreditkort. Ingen binding.</p>
                <p className="text-3xl font-extrabold text-white mt-5">0 kr<span className="text-base font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>/md</span></p>
              </div>
              <ul className="space-y-3 flex-1">
                {[
                  'Ugentlig AI-overvågningsrapport',
                  'ChatGPT, Gemini og Perplexity',
                  'Rapport direkte i din indbakke',
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

            {/* InsideAI Pro — Coming soon */}
            <div
              className="relative rounded-2xl p-8 flex flex-col gap-6"
              style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.2)' }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span
                  className="rounded-full px-3 py-0.5 text-[11px] font-bold"
                  style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.35)', color: '#00D4FF' }}
                >
                  Lanceres Q3 2026
                </span>
              </div>
              <div>
                <h3 className="font-bold text-xl text-white">InsideAI Pro</h3>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Du ved ikke bare om du nævnes — du ved præcis, hvornår det begyndte at gå galt.</p>
                <div className="mt-5">
                  <p className="text-3xl font-extrabold text-white">fra 299 kr<span className="text-base font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>/md</span></p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Vejledende pris · Skriv dig op og lås early access-prisen</p>
                </div>
              </div>
              <ul className="space-y-3 flex-1">
                {[
                  'Alt fra gratis',
                  'Historisk trendvisning uge for uge',
                  'Konkurrentovervågning op til 3',
                  'Tidlig adgang og prioriteret support',
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
                Skriv dig op — begrænset antal pladser →
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
                Har du en AIScore-rapport? Aktiver InsideAI med din rapport-kode og få 3 måneders gratis overvågning inkluderet.
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

          {submitted ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)' }}
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#00D4FF' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Tjek din email</h3>
              <p className="mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Vi har sendt en bekræftelsesmail til
              </p>
              <p className="font-semibold mb-6" style={{ color: '#00D4FF' }}>{submittedEmail}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Klik på linket i emailen for at aktivere din overvågning.<br />
                Linket udløber efter 24 timer.
              </p>
              <p className="text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Ingen email? Tjek din spam-mappe eller{' '}
                <button
                  onClick={() => setSubmitted(false)}
                  className="underline hover:no-underline transition-all"
                  style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  prøv igen
                </button>
                .
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* ── Om os ── */}
      <section className="py-20 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#00D4FF' }}>Om os</p>
          <h2 className="text-3xl font-bold mb-10" style={{ letterSpacing: '-0.02em' }}>
            Hvem er bag InsideAI?
          </h2>
          <div className="space-y-5 text-left max-w-2xl mx-auto">
            <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              InsideAI drives af AI Institute — grundlagt af Dennis Plejdrup med det ene formål at gøre det enkelt for danske virksomheder at holde sig opdateret på AI.
            </p>
            <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Vi tror ikke på, at virksomheder skal bruge tid på at følge tekniske blogindlæg eller decode AI-nyheder. Vi gør det for dig og sender dig det, der faktisk betyder noget.
            </p>
            <p className="font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Ingen jargon. Ingen hype. Bare det du har brug for at vide.
            </p>
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
            <p className="mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Tilmeld InsideAI gratis og få den ugentlige rapport direkte i indbakken.</p>
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
              <p className="text-xs leading-relaxed max-w-[220px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                InsideAI – AI-indsigt for alle danske virksomheder.<br />Udviklet af AI Institute ApS.
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
                <a href="https://aisignal.dk" className="hover:text-white transition-colors">InsideAI — Løbende monitorering</a>
                <a href="https://aiselect.dk" className="hover:text-white transition-colors">AISelect — Implementeringsretainer</a>
              </div>
            </div>
          </div>

          <div className="pt-6 text-xs text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
            © 2026 AI Institute ApS · CVR 44690615 · InsideAI™ er et varemærke tilhørende AI Institute ApS
          </div>
        </div>
      </footer>
    </div>
  );
}
