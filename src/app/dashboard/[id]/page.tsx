'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  mentionRate: number;
  chosenRate: number;
  avgScore: number;
  avgSentiment: number;
  runCount: number;
  totalResults: number;
}

interface TrendPoint {
  date: string;
  avgScore: number;
  mentionRate: number;
  chosenRate: number;
  avgSentiment: number;
}

interface SystemStat {
  system: string;
  avgScore: number;
  mentionRate: number;
}

interface TypeStat {
  type: string;
  avgScore: number;
  mentionRate: number;
  chosenRate: number;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  created_at: string;
  seen: number;
}

interface RecentResult {
  id: string;
  prompt_type: string;
  ai_system: string;
  mentioned: number;
  chosen: number;
  score: number;
  sentiment: number;
  response: string;
  created_at: string;
}

interface UpsellBanner {
  recommendation: 'aiscore' | 'aiselect';
  product: string;
  headline: string;
  body: string;
  cta: string;
  color: string;
  count: number;
}

interface EconomicImpact {
  currentChosenRate: number;
  industryMedianChosenRate: number;
  estimatedMonthlyLeads: number;
  estimatedMonthlyRevenueDKK: number;
  industryMonthlyRevenueDKK: number;
  deltaRevenueDKK: number;
  interpretation: string;
}

interface TimeseriesData {
  dates: string[];
  systems: Record<string, { mentionRate: number[]; chosenRate: number[] }>;
  aggregated: { mentionRate: number[]; chosenRate: number[] };
}

interface DashboardData {
  company: {
    id: string;
    name: string;
    domain: string;
    category: string;
    plan: 'free' | 'premium';
    productsPurchased: string[];
    trialEndsAt: string | null;
    trialActive: boolean;
    trialDaysLeft: number | null;
  };
  stats: Stats;
  economicImpact?: EconomicImpact;
  trend: TrendPoint[];
  bySystem: SystemStat[];
  byType: TypeStat[];
  alerts: Alert[];
  recentResults: RecentResult[];
}

const PROMPT_TYPE_LABELS: Record<string, string> = {
  direct_choice: 'Direktvalg',
  competitor_comparison: 'Konkurrentsammenligning',
  category_solution: 'Kategori-løsning',
  brand_recognition: 'Brandkendskab',
  trust: 'Tillidsgrad',
  // Legacy labels for backward compatibility
  recommendation: 'Anbefalingstest',
  best_in_category: 'Bedst i kategori',
  perception: 'Opfattelsesanalyse',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  valgt_fald: 'Valgt-score faldet',
  nævnt_fald: 'Nævnt-score faldet',
  konkurrent_overtag: 'Konkurrent overtager',
  sentiment_aendring: 'Sentiment ændret',
  position_aendring: 'Position ændret',
  score_drop: 'Score faldet',
  score_rise: 'Score steget',
  not_mentioned: 'Ikke nævnt',
};

function isNegativeAlert(type: string): boolean {
  return ['valgt_fald', 'nævnt_fald', 'konkurrent_overtag', 'sentiment_aendring', 'position_aendring', 'score_drop', 'not_mentioned'].includes(type);
}

function ScoreBar({ value, max = 100, color = 'bg-violet-500' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, suffix = '', sub }: { label: string; value: number | string; suffix?: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">
        {value}<span className="text-lg text-zinc-400">{suffix}</span>
      </div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

function sentimentLabel(sentiment: number): string {
  if (sentiment > 0.3) return 'Positiv';
  if (sentiment < -0.1) return 'Negativ';
  return 'Neutral';
}

function sentimentColor(sentiment: number): string {
  if (sentiment > 0.3) return 'text-green-400';
  if (sentiment < -0.1) return 'text-red-400';
  return 'text-zinc-400';
}

const SYSTEM_COLORS: Record<string, string> = {
  ChatGPT: '#10b981',
  Gemini: '#3b82f6',
  Perplexity: '#f59e0b',
  Claude: '#8b5cf6',
  Aggregeret: '#ffffff',
};

function getSystemColor(system: string, idx: number): string {
  if (SYSTEM_COLORS[system]) return SYSTEM_COLORS[system];
  const fallbacks = ['#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7'];
  return fallbacks[idx % fallbacks.length];
}

function SystemHistoryChart({ data }: { data: TimeseriesData }) {
  const { dates, systems, aggregated } = data;
  if (dates.length < 2) return null;

  const w = 600;
  const h = 140;
  const padTop = 12;
  const padBottom = 4;
  const drawH = h - padTop - padBottom;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; idx: number } | null>(null);

  const allSystems = Object.keys(systems);
  const allSeries: Array<{ name: string; values: number[]; color: string }> = [
    ...allSystems.map((s, i) => ({ name: s, values: systems[s].mentionRate, color: getSystemColor(s, i) })),
    { name: 'Aggregeret', values: aggregated.mentionRate, color: SYSTEM_COLORS['Aggregeret'] },
  ];

  const maxVal = Math.max(...allSeries.flatMap(s => s.values), 20);

  const buildPath = (values: number[]) => {
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = padTop + drawH - (v / maxVal) * drawH;
      return `${x},${y}`;
    });
    return `M ${pts.join(' L ')}`;
  };

  const gridLines = [0, 25, 50, 75, 100].filter(v => v <= maxVal + 5);

  return (
    <div>
      <div className="relative" onMouseLeave={() => setTooltip(null)}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full"
          style={{ height: 140 }}
          preserveAspectRatio="none"
          onMouseMove={e => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.round(relX * (dates.length - 1));
            setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, idx: Math.max(0, Math.min(idx, dates.length - 1)) });
          }}
        >
          {/* Grid lines */}
          {gridLines.map(v => {
            const y = padTop + drawH - (v / maxVal) * drawH;
            return (
              <g key={v}>
                <line x1={0} y1={y} x2={w} y2={y} stroke="#27272a" strokeWidth={1} />
                <text x={4} y={y - 3} fill="#52525b" fontSize={9} fontFamily="monospace">{v}%</text>
              </g>
            );
          })}
          {allSeries.map((s, si) => (
            <path
              key={s.name}
              d={buildPath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.name === 'Aggregeret' ? 2.5 : 1.5}
              strokeOpacity={s.name === 'Aggregeret' ? 0.95 : 0.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.name === 'Aggregeret' ? undefined : si % 2 === 1 ? '5,3' : undefined}
            />
          ))}
        </svg>
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs shadow-xl z-10"
            style={{ left: Math.min(tooltip.x + 8, 300), top: 8 }}
          >
            <div className="text-zinc-400 mb-1 font-medium">{dates[tooltip.idx]}</div>
            {allSeries.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                <span className="text-zinc-300">{s.name}:</span>
                <span className="font-medium" style={{ color: s.color }}>{s.values[tooltip.idx]}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
        {allSeries.map(s => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className="w-3 h-0.5 inline-block rounded" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function EconomicImpactWidget({ impact }: { impact: EconomicImpact }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isPositive = impact.deltaRevenueDKK > 0;
  const isNeutral = impact.deltaRevenueDKK === 0 || impact.currentChosenRate === 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Estimeret omsætningspåvirkning</span>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="w-4 h-4 rounded-full border border-zinc-700 text-zinc-500 text-xs flex items-center justify-center hover:border-zinc-500 hover:text-zinc-300 transition-colors relative"
          >
            ?
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 shadow-xl z-20 text-left normal-case">
                <p className="font-medium text-white mb-1">Estimeringsmetode</p>
                <p className="text-zinc-400 leading-relaxed">
                  Baseret på din Valgt-score ({impact.currentChosenRate}%) sammenlignet med branchemedianen ({impact.industryMedianChosenRate}%).
                  Antager 200 AI-drevne leads/måned, 5% konvertering og gns. dealværdi på 50.000 DKK.
                </p>
              </div>
            )}
          </button>
        </div>
        {!isNeutral && (
          <span className={`text-lg font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? '↑' : '↓'}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${isNeutral ? 'text-zinc-400' : isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isNeutral
          ? '—'
          : `${isPositive ? '+' : ''}${impact.deltaRevenueDKK.toLocaleString('da-DK')} kr/md`}
      </div>
      <div className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{impact.interpretation}</div>
      {!isNeutral && (
        <div className="flex items-center gap-4 mt-3 text-xs text-zinc-600">
          <span>Din Valgt%: <span className="text-zinc-400">{impact.currentChosenRate}%</span></span>
          <span>Branche median: <span className="text-zinc-400">{impact.industryMedianChosenRate}%</span></span>
        </div>
      )}
    </div>
  );
}

function DualCurveChart({ trend }: { trend: TrendPoint[] }) {
  if (trend.length < 2) return null;
  const w = 300;
  const h = 100;
  const padTop = 10;
  const padBottom = 4;
  const drawH = h - padTop - padBottom;

  const maxMention = Math.max(...trend.map(t => t.mentionRate), 1);
  const maxChosen = Math.max(...trend.map(t => t.chosenRate), 1);
  const maxVal = Math.max(maxMention, maxChosen, 20);

  const mentionPts = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = padTop + drawH - (t.mentionRate / maxVal) * drawH;
    return `${x},${y}`;
  });

  const chosenPts = trend.map((t, i) => {
    const x = (i / (trend.length - 1)) * w;
    const y = padTop + drawH - (t.chosenRate / maxVal) * drawH;
    return `${x},${y}`;
  });

  const mentionPath = `M ${mentionPts.join(' L ')}`;
  const chosenPath = `M ${chosenPts.join(' L ')}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 100 }} preserveAspectRatio="none">
        {/* Grid */}
        {[0, 50, 100].filter(v => v <= maxVal + 5).map(v => {
          const y = padTop + drawH - (v / maxVal) * drawH;
          return <line key={v} x1={0} y1={y} x2={w} y2={y} stroke="#27272a" strokeWidth={1} />;
        })}
        <path d={mentionPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={chosenPath} fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,2" />
      </svg>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-3 h-0.5 bg-green-500 inline-block" />
          Nævnt-score
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <span className="w-3 h-0.5 inline-block" style={{ background: 'repeating-linear-gradient(90deg,#6c63ff 0,#6c63ff 4px,transparent 4px,transparent 6px)' }} />
          Valgt-score
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [upsell, setUpsell] = useState<UpsellBanner | null>(null);
  const [upsellDismissed, setUpsellDismissed] = useState(false);
  const [timeseries, setTimeseries] = useState<TimeseriesData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/companies/${id}/results`);
      if (res.status === 404) {
        router.push('/');
        return;
      }
      const d = await res.json();
      setData(d);
    } catch {
      setError('Kunne ikke hente data.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    fetch(`/api/monitoring/timeseries?companyId=${id}&days=30`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTimeseries(d); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    // Load upsell recommendation once on mount (every ~5th page load via session storage counter)
    const key = `upsell_shown_${id}`;
    const shown = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (shown === 0) {
      fetch(`/api/upsell?companyId=${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setUpsell(d);
        })
        .catch(() => {});
      sessionStorage.setItem(key, '1');
    }
  }, [id]);

  const triggerRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/monitor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: id }),
      });
      const d = await res.json();
      if (d.throttled) {
        alert(d.message);
      } else {
        setTimeout(fetchData, 8000);
      }
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Indlæser data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-red-400 text-sm">{error || 'Ingen data'}</div>
      </div>
    );
  }

  const { company, stats, economicImpact, trend, bySystem, byType, alerts, recentResults } = data;
  const unseenAlerts = alerts.filter(a => !a.seen);
  const avgSentiment = stats.avgSentiment ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80">
              <span className="font-bold tracking-tight text-lg leading-none"><span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span></span>
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-300">{company.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {company.trialActive && (
              <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-2.5 py-0.5 text-xs text-violet-400">
                Premium
              </span>
            )}
            {unseenAlerts.length > 0 && (
              <span className="rounded-full bg-red-500/20 border border-red-500/30 px-2.5 py-0.5 text-xs text-red-400">
                {unseenAlerts.length} alert{unseenAlerts.length > 1 ? 's' : ''}
              </span>
            )}
            {!company.trialActive && (
              <button
                onClick={() => router.push(`/dashboard/${id}/upgrade`)}
                className="rounded-lg border border-violet-500/40 text-violet-400 hover:bg-violet-500/10 px-4 py-1.5 text-xs font-medium transition-colors"
              >
                Opgrader
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/${id}/settings`)}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 text-xs font-medium transition-colors"
            >
              Indstillinger
            </button>
            <button
              onClick={async () => {
                await fetch('/api/logout', { method: 'POST' });
                router.push('/login');
              }}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 text-xs font-medium transition-colors"
            >
              Log ud
            </button>
            <button
              onClick={triggerRun}
              disabled={running}
              className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-1.5 text-xs font-medium transition-colors"
            >
              {running ? 'Kører...' : 'Kør nu'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8 pb-0">
        {/* Premium trial banner */}
        {company.trialActive && company.trialDaysLeft !== null && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-bold">✦</div>
              <div>
                <div className="text-sm font-semibold text-violet-300">InsideAI Premium — gratis prøveperiode</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Du har adgang til alle premium-funktioner i <span className="text-violet-400 font-medium">{company.trialDaysLeft} dage</span> som tak for dit AIScore-køb.
                  Herefter aktiveres automatisk betaling.
                </div>
              </div>
            </div>
            <span className="rounded-full bg-violet-500/20 border border-violet-500/30 px-3 py-1 text-xs text-violet-400 whitespace-nowrap">
              Premium aktiv
            </span>
          </div>
        )}

        {/* Upsell banner */}
        {upsell && !upsellDismissed && (
          <div className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-4 ${
            upsell.color === 'pink'
              ? 'border-pink-500/30 bg-pink-500/5'
              : 'border-blue-500/30 bg-blue-500/5'
          }`}>
            <div className="flex items-start gap-3 flex-1">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                upsell.color === 'pink' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {upsell.color === 'pink' ? '★' : '⬡'}
              </div>
              <div className="flex-1">
                <div className={`text-xs font-medium mb-0.5 ${upsell.color === 'pink' ? 'text-pink-400' : 'text-blue-400'}`}>
                  {upsell.product}
                </div>
                <div className="text-sm font-semibold text-white mb-1">{upsell.headline}</div>
                <div className="text-xs text-zinc-400 leading-relaxed">{upsell.body}</div>
              </div>
            </div>
            <button
              onClick={() => setUpsellDismissed(true)}
              className="text-zinc-600 hover:text-zinc-400 text-lg leading-none shrink-0"
              aria-label="Luk"
            >
              ×
            </button>
          </div>
        )}

        {/* Empty state */}
        {stats.totalResults === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
            <div className="text-4xl mb-4">📡</div>
            <h2 className="text-lg font-semibold mb-2">Første monitorering er igang</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Vi stiller prompts til AI-systemerne nu. Resultater klar om ca. 30–60 sekunder.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              Venter på resultater...
            </div>
          </div>
        )}

        {/* Stats row */}
        {stats.totalResults > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Nævnt-score"
                value={stats.mentionRate}
                suffix="%"
                sub="nævnt af AI-systemer"
              />
              <StatCard
                label="Valgt-score"
                value={stats.chosenRate}
                suffix="%"
                sub="valgt som foretrukken"
              />
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div className="text-xs text-zinc-500 mb-1">Sentiment</div>
                <div className={`text-3xl font-bold ${sentimentColor(avgSentiment)}`}>
                  {sentimentLabel(avgSentiment)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">score: {avgSentiment > 0 ? '+' : ''}{avgSentiment.toFixed(2)}</div>
              </div>
              <StatCard label="Analyser" value={stats.totalResults} sub={`${stats.runCount} kørsler`} />
            </div>

            {/* Economic impact widget */}
            {economicImpact && (
              <EconomicImpactWidget impact={economicImpact} />
            )}

            {/* Historik-graf per AI-system (30 dage) */}
            {timeseries && timeseries.dates.length > 1 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white tracking-tight">Historik — Nævnt% per AI-system</h2>
                  <span className="text-xs text-zinc-500">Seneste 30 dage</span>
                </div>
                <SystemHistoryChart data={timeseries} />
                <div className="flex justify-between text-xs text-zinc-600 mt-2">
                  <span>{timeseries.dates[0]}</span>
                  <span>{timeseries.dates[timeseries.dates.length - 1]}</span>
                </div>
              </div>
            )}

            {/* Nævnt vs Valgt dual-curve chart */}
            {trend.length > 1 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-white tracking-tight">Nævnt vs Valgt over tid</h2>
                  <span className="text-xs text-zinc-500">Seneste {trend.length} dage</span>
                </div>
                <DualCurveChart trend={trend} />
                <div className="flex justify-between text-xs text-zinc-600 mt-2">
                  <span>{trend[0]?.date}</span>
                  <span>{trend[trend.length - 1]?.date}</span>
                </div>
              </div>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold text-white tracking-tight">Alerts</h2>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    unseenAlerts.length > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {unseenAlerts.length > 0 ? `${unseenAlerts.length} ny` : `${alerts.length} total`}
                  </span>
                </div>
                {alerts.map(a => (
                  <div
                    key={a.id}
                    className={`rounded-lg border text-sm flex items-start gap-3 overflow-hidden ${
                      isNegativeAlert(a.type)
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-green-500/30 bg-green-500/5'
                    }`}
                  >
                    <div className={`w-1 self-stretch shrink-0 ${isNegativeAlert(a.type) ? 'bg-red-500' : 'bg-green-500'}`} />
                    <div className="flex items-start gap-3 flex-1 px-3 py-3">
                      <span className={`shrink-0 mt-0.5 text-base font-bold ${isNegativeAlert(a.type) ? 'text-red-400' : 'text-green-400'}`}>
                        {isNegativeAlert(a.type) ? '↓' : '↑'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold text-xs tracking-wide uppercase block mb-0.5 ${isNegativeAlert(a.type) ? 'text-red-400' : 'text-green-400'}`}>
                          {ALERT_TYPE_LABELS[a.type] || a.type}
                        </span>
                        <span className={`text-sm leading-relaxed ${isNegativeAlert(a.type) ? 'text-red-200' : 'text-green-200'}`}>{a.message}</span>
                      </div>
                      <span className="ml-auto shrink-0 text-xs text-zinc-500 mt-0.5">{a.created_at.split('T')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Per-type breakdown */}
            {byType.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-base font-semibold text-white tracking-tight mb-4">Analyse pr. testtype</h2>
                <div className="space-y-4">
                  {byType.map(t => (
                    <div key={t.type}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-zinc-300">{PROMPT_TYPE_LABELS[t.type] || t.type}</span>
                        <div className="flex items-center gap-3 text-zinc-500">
                          <span>Nævnt {t.mentionRate}%</span>
                          <span>Valgt {t.chosenRate}%</span>
                          <span className="text-violet-400 font-medium">{t.avgScore}/100</span>
                        </div>
                      </div>
                      <ScoreBar value={t.avgScore} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI system breakdown */}
            {bySystem.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-base font-semibold text-white tracking-tight mb-4">AI-systemer</h2>
                <div className="space-y-3">
                  {bySystem.map(s => (
                    <div key={s.system} className="flex items-center gap-4 text-xs">
                      <span className="w-40 truncate text-zinc-400">{s.system}</span>
                      <div className="flex-1">
                        <ScoreBar value={s.avgScore} />
                      </div>
                      <span className="text-zinc-300 w-12 text-right">{s.avgScore}/100</span>
                      <span className="text-zinc-500 w-20 text-right">nævnt {s.mentionRate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent results */}
            {recentResults.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-base font-semibold text-white tracking-tight mb-4">Seneste resultater</h2>
                <div className="space-y-2">
                  {recentResults.map(r => (
                    <div key={r.id} className="border border-zinc-800 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setExpandedResult(expandedResult === r.id ? null : r.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-xs text-left hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-2 h-2 rounded-full ${r.mentioned ? 'bg-green-400' : 'bg-zinc-600'}`}
                          />
                          <span className="text-zinc-300">{PROMPT_TYPE_LABELS[r.prompt_type] || r.prompt_type}</span>
                          {r.chosen ? (
                            <span className="rounded-full bg-violet-500/20 text-violet-400 px-2 py-0.5">Valgt</span>
                          ) : r.mentioned ? (
                            <span className="rounded-full bg-green-500/20 text-green-400 px-2 py-0.5">Nævnt</span>
                          ) : (
                            <span className="rounded-full bg-zinc-700 text-zinc-500 px-2 py-0.5">Ikke nævnt</span>
                          )}
                          {r.sentiment !== undefined && r.sentiment !== 0 && (
                            <span className={`rounded-full px-2 py-0.5 ${r.sentiment > 0.3 ? 'bg-green-500/10 text-green-400' : r.sentiment < -0.1 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-700 text-zinc-500'}`}>
                              {r.sentiment > 0 ? '+' : ''}{r.sentiment.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-zinc-500">
                          <span className="text-violet-400">{r.score}/100</span>
                          <span>{r.created_at.replace('T', ' ').split('.')[0]}</span>
                          <span>{expandedResult === r.id ? '↑' : '↓'}</span>
                        </div>
                      </button>
                      {expandedResult === r.id && (
                        <div className="border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400 bg-zinc-950/50">
                          <p className="text-zinc-500 mb-2 font-medium">AI-svar:</p>
                          <p className="leading-relaxed whitespace-pre-wrap">{r.response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Premium upgrade CTA for free users */}
        {company.plan === 'free' && !company.trialActive && stats.totalResults > 0 && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 text-lg font-bold shrink-0">✦</div>
              <div>
                <div className="text-sm font-semibold text-violet-300 mb-1">Du er på gratis plan — 3 signaler per rapport</div>
                <div className="text-xs text-zinc-400 leading-relaxed max-w-lg">
                  Opgrader til Premium for ubegrænsede AI-signaler, branchefilter og valgfri rapportfrekvens.
                  Premium-brugere ser op til 15× flere datapunkter per rapport og kan overvåge konkurrenter på tværs af alle AI-systemer.
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(`/dashboard/${id}/upgrade`)}
              className="rounded-lg bg-violet-600 hover:bg-violet-500 px-5 py-2 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              Opgrader til Premium
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2a3a] mt-12 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <span className="font-bold tracking-tight text-base"><span className="text-[#a78bfa]">AI</span><span className="text-[#e8e8f0]">Signal</span></span>
              <p className="text-xs text-[#888898] mt-1">AI-synlighedsmonitorering for virksomheder.</p>
              <p className="text-xs text-[#888898]">Udviklet af AI Institute ApS.</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#888898]">
              <span className="font-medium text-[#e8e8f0]">AI-familien</span>
              <a href="https://aiscore.dk" className="hover:text-[#a78bfa] transition-colors">AIScore</a>
              <a href="https://aisignal.dk" className="hover:text-[#a78bfa] transition-colors">InsideAI</a>
              <a href="https://aiselect.dk" className="hover:text-[#a78bfa] transition-colors">AISelect</a>
            </div>
          </div>
          <div className="border-t border-[#2a2a3a] pt-4">
            <p className="text-xs text-[#888898]">© 2026 AI Institute ApS · CVR 44690615 · InsideAI™ er et varemærke tilhørende AI Institute ApS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
