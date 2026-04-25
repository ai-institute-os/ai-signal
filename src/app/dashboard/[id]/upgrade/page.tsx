'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface CompanyData {
  id: string;
  name: string;
  aisignal_plan: 'free' | 'premium';
  trial_ends_at: string | null;
  products_purchased: string[];
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
}

const PLANS = [
  {
    key: 'lille' as const,
    name: 'Lille',
    price: 'Gratis',
    priceSub: 'for altid',
    color: 'zinc',
    badge: null,
    description: 'Grundlæggende AI-synligheds-monitorering for nye virksomheder.',
    features: [
      'Automatisk monitorering (daglig)',
      'Nævnt- og valgt-score',
      'Sentiment-analyse',
      'Alerts ved store ændringer',
      '3 konkurrenter',
      'Én AI-model (GPT-4)',
    ],
    cta: 'Din nuværende plan',
    ctaDisabled: true,
    stripePlan: null,
  },
  {
    key: 'mellem' as const,
    name: 'Mellem',
    price: '997 kr',
    priceSub: '/ måned',
    color: 'violet',
    badge: 'Mest populær',
    description: 'Løbende premium-overvågning med flere AI-modeller og prioriterede alerts.',
    features: [
      'Alt i Lille',
      'Monitorering på tværs af 4 AI-modeller',
      'Daglige + ugentlige trend-rapporter',
      'Prioriterede alerts (SMS + email)',
      'Op til 10 konkurrenter',
      'Benchmarking mod branche',
      'Adgang til historik (12 måneder)',
    ],
    cta: 'Vælg Mellem',
    ctaDisabled: false,
    stripePlan: 'mellem' as const,
  },
  {
    key: 'stor' as const,
    name: 'Stor',
    price: 'Fra 2.497 kr',
    priceSub: '/ måned',
    color: 'blue',
    badge: 'Fuld suite',
    description: 'AISignal + AIScore + AISelect. Strategisk analyse og løbende positionering.',
    features: [
      'Alt i Mellem',
      'AIScore strategisk analyse (engangs)',
      'AISelect retainer (løbende positionering)',
      'Personlig AI-synligheds-konsulent',
      'Månedlige strategimøder',
      'Ubegrænset konkurrenter',
      'Prioriteret support',
    ],
    cta: 'Vælg Stor',
    ctaDisabled: false,
    stripePlan: 'stor' as const,
  },
];

export default function UpgradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetch(`/api/companies/${id}`)
      .then((r) => {
        if (r.status === 404) { router.push('/'); return null; }
        return r.json();
      })
      .then((d: CompanyData | null) => { if (d) setCompany(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      setToast({ type: 'success', msg: 'Abonnement aktiveret! Velkommen til premium.' });
    } else if (checkout === 'cancelled') {
      setToast({ type: 'error', msg: 'Checkout annulleret. Ingen betaling gennemført.' });
    }
  }, [searchParams]);

  const handleStripeCheckout = async (plan: 'mellem' | 'stor') => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: id, plan }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({ type: 'error', msg: data.error ?? 'Kunne ikke starte checkout' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Netværksfejl — prøv igen' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: id }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({ type: 'error', msg: data.error ?? 'Kunne ikke åbne kundeportal' });
      }
    } catch {
      setToast({ type: 'error', msg: 'Netværksfejl — prøv igen' });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400 text-sm animate-pulse">Indlæser...</div>
      </div>
    );
  }

  const trialActive = company?.aisignal_plan === 'premium' && !!company.trial_ends_at && new Date(company.trial_ends_at) > new Date();
  const hasPaidSubscription = !!company?.stripe_subscription_id && company.stripe_subscription_status === 'active';
  const currentPlanKey = hasPaidSubscription ? 'premium' : trialActive ? 'premium' : 'free';

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      <nav className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 hover:opacity-80">
              <div className="w-7 h-7 rounded-md bg-violet-500 flex items-center justify-center text-xs font-bold">AI</div>
              <span className="font-semibold tracking-tight">AISignal</span>
            </button>
            <span className="text-zinc-600">/</span>
            <button onClick={() => router.push(`/dashboard/${id}`)} className="text-sm text-zinc-300 hover:text-white">
              {company?.name ?? id}
            </button>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400">Pakker</span>
          </div>
          <div className="flex items-center gap-2">
            {company?.stripe_customer_id && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                {portalLoading ? 'Åbner...' : 'Administrer abonnement'}
              </button>
            )}
            <button
              onClick={() => router.push(`/dashboard/${id}`)}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 text-xs font-medium transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Vælg den rigtige pakke</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Start gratis og opgrader når du er klar. Alle pakker inkluderer automatisk AI-monitorering.
          </p>
          {trialActive && company?.trial_ends_at && (
            <div className="mt-4 inline-block rounded-lg bg-violet-500/10 border border-violet-500/30 px-4 py-2 text-sm text-violet-300">
              Din gratis premium trial udløber {new Date(company.trial_ends_at).toLocaleDateString('da-DK')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.key === 'lille' ? currentPlanKey === 'free' : (hasPaidSubscription && currentPlanKey === 'premium');
            const isHighlighted = plan.color === 'violet';
            const isLoading = checkoutLoading === plan.stripePlan;

            return (
              <div
                key={plan.key}
                className={`rounded-2xl border p-6 flex flex-col relative ${
                  isHighlighted
                    ? 'border-violet-500/50 bg-violet-500/5'
                    : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold ${
                    plan.color === 'violet'
                      ? 'bg-violet-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}>
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">{plan.name}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-sm text-zinc-500 mb-1">{plan.priceSub}</span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed mt-3">{plan.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <span className={`mt-0.5 shrink-0 ${isHighlighted ? 'text-violet-400' : 'text-zinc-500'}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => {
                    if (!plan.stripePlan || plan.ctaDisabled || isCurrent) return;
                    handleStripeCheckout(plan.stripePlan);
                  }}
                  disabled={plan.ctaDisabled || isCurrent || isLoading}
                  className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-zinc-800 text-zinc-500 cursor-default'
                      : isHighlighted
                      ? 'bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60'
                      : plan.color === 'blue'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-60'
                      : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                  }`}
                >
                  {isCurrent
                    ? '✓ Nuværende plan'
                    : isLoading
                    ? 'Opretter checkout...'
                    : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-lg font-semibold mb-6">Ofte stillede spørgsmål</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            {[
              {
                q: 'Hvad er AIScore?',
                a: 'En strategisk engangsanalyse der viser præcis hvordan AI-systemer opfatter din virksomhed — og hvad der skal til for at du vælges frem for konkurrenterne.',
              },
              {
                q: 'Hvad er AISelect?',
                a: 'Et løbende retainer-system der sikrer, at dine ændringer ikke skader din AI-position, og at forbedringer sker kontrolleret over tid.',
              },
              {
                q: 'Kan jeg opgradere eller nedgradere?',
                a: 'Ja. Klik "Administrer abonnement" for at skifte pakke, sætte på pause eller annullere. Ingen binding.',
              },
              {
                q: 'Hvad sker der med mine data?',
                a: 'Dine data opbevares sikkert og bruges kun til at generere dine AI-synlighedsrapporter. Vi deler aldrig data med tredjepart.',
              },
              {
                q: 'Hvad sker der efter min gratis trial?',
                a: 'Har du tilknyttet et betalingskort vil dit abonnement automatisk starte på Mellem-pakken. Ellers nedgraderes du til Lille (gratis).',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <div className="font-semibold text-white mb-1">{q}</div>
                <div className="text-zinc-400 leading-relaxed">{a}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
