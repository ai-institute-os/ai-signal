'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const CATEGORIES = [
  { id: 'ai-nyheder', label: 'AI-nyheder' },
  { id: 'produktopdateringer', label: 'Produktopdateringer' },
  { id: 'casestudier', label: 'Casestudier' },
  { id: 'lovgivning', label: 'Lovgivning/regulering' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

interface PrefsData {
  email: string;
  categories: CategoryId[];
  frequency: 'weekly' | 'monthly';
  status: string;
  unsubscribed_at: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const NAVY = '#0A1628';
const NAVY_CARD = '#0D1F3C';
const NAVY_BORDER = '#1A3354';
const CYAN = '#00D4FF';

function PreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [prefs, setPrefs] = useState<PrefsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryId[]>([]);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [unsubscribed, setUnsubscribed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Ugyldigt link. Brug linket fra din email.');
      setLoading(false);
      return;
    }

    fetch(`/api/preferences/update?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: PrefsData) => {
        setPrefs(data);
        setCategories(data.categories as CategoryId[]);
        setFrequency(data.frequency);
        setUnsubscribed(data.status === 'unsubscribed' || !!data.unsubscribed_at);
        setLoading(false);
      })
      .catch(() => {
        setError('Kunne ikke hente dine indstillinger. Prøv igen via linket i din email.');
        setLoading(false);
      });
  }, [token]);

  async function save(updates: { categories?: CategoryId[]; frequency?: string }) {
    if (!token) return;
    setSaveState('saving');
    const res = await fetch(`/api/preferences/update?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
      return;
    }
    const data = await res.json();
    setCategories(data.categories as CategoryId[]);
    setFrequency(data.frequency);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  }

  async function doUnsubscribe() {
    if (!token || !confirm('Er du sikker på, at du vil afmelde alle AISignal-emails?')) return;
    setSaveState('saving');
    const res = await fetch(`/api/preferences/update?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unsubscribe: true }),
    });
    if (!res.ok) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
      return;
    }
    setUnsubscribed(true);
    setSaveState('idle');
  }

  function toggleCategory(id: CategoryId) {
    setCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  const dirty =
    JSON.stringify([...categories].sort()) !== JSON.stringify([...(prefs?.categories ?? [])].sort()) ||
    frequency !== prefs?.frequency;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: NAVY }}>
        <p style={{ color: CYAN }} className="text-sm animate-pulse">Henter dine indstillinger…</p>
      </div>
    );
  }

  if (error || !prefs) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: NAVY }}>
        <div className="rounded-2xl p-8 max-w-sm w-full text-center" style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_BORDER}` }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <span className="text-red-400 text-xl font-bold">✕</span>
          </div>
          <h1 className="font-bold text-xl mb-2 text-white">Ugyldigt link</h1>
          <p className="text-sm" style={{ color: '#8BA3C7' }}>{error || 'Noget gik galt.'}</p>
        </div>
      </div>
    );
  }

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: NAVY }}>
        <div className="rounded-2xl p-8 max-w-sm w-full text-center" style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_BORDER}` }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(0,212,255,0.1)', border: `1px solid rgba(0,212,255,0.3)` }}>
            <span className="text-sm font-bold" style={{ color: CYAN }}>✓</span>
          </div>
          <h1 className="font-bold text-xl mb-2 text-white">Du er afmeldt</h1>
          <p className="text-sm" style={{ color: '#8BA3C7' }}>
            Du modtager ikke længere emails fra AISignal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: NAVY }}>
      <div className="max-w-md mx-auto">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: CYAN, color: NAVY }}>
            AI
          </div>
          <span className="font-semibold text-white text-base">AISignal</span>
        </div>

        <h1 className="font-bold text-2xl text-white mb-1">Email-præferencer</h1>
        <p className="text-sm mb-8" style={{ color: '#8BA3C7' }}>
          Vælg hvilke emails du vil modtage på <span className="text-white">{prefs.email}</span>
        </p>

        {/* Categories */}
        <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_BORDER}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8BA3C7' }}>
            Indholdstyper
          </p>
          <div className="space-y-2.5">
            {CATEGORIES.map(({ id, label }) => {
              const checked = categories.includes(id);
              return (
                <label
                  key={id}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all select-none"
                  style={{
                    backgroundColor: checked ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${checked ? 'rgba(0,212,255,0.35)' : NAVY_BORDER}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      backgroundColor: checked ? CYAN : 'transparent',
                      border: `2px solid ${checked ? CYAN : '#2A4A6B'}`,
                    }}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(id)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-white">{label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: '#4A6B8A' }}>
            Fravælg kategorier du ikke er interesseret i.
          </p>
        </div>

        {/* Frequency */}
        <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_BORDER}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8BA3C7' }}>
            Frekvens
          </p>
          <div className="flex gap-2">
            {(['weekly', 'monthly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                disabled={saveState === 'saving'}
                className="flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: frequency === f ? CYAN : 'rgba(255,255,255,0.04)',
                  color: frequency === f ? NAVY : '#8BA3C7',
                  border: `1px solid ${frequency === f ? CYAN : NAVY_BORDER}`,
                  fontWeight: frequency === f ? 600 : 400,
                }}
              >
                {f === 'weekly' ? 'Ugentlig' : 'Månedlig'}
              </button>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: '#4A6B8A' }}>
            {frequency === 'weekly' ? 'Du modtager én email om ugen.' : 'Du modtager én email om måneden.'}
          </p>
        </div>

        {/* Save button */}
        {dirty && (
          <button
            onClick={() => save({ categories, frequency })}
            disabled={saveState === 'saving'}
            className="w-full py-3 rounded-xl text-sm font-semibold mb-4 transition-all disabled:opacity-60"
            style={{ backgroundColor: CYAN, color: NAVY }}
          >
            {saveState === 'saving' ? 'Gemmer…' : 'Gem indstillinger'}
          </button>
        )}

        {/* Feedback */}
        {saveState === 'saved' && (
          <div className="rounded-lg px-4 py-2.5 mb-4" style={{ backgroundColor: 'rgba(0,212,255,0.08)', border: `1px solid rgba(0,212,255,0.3)` }}>
            <p className="text-sm" style={{ color: CYAN }}>Indstillinger gemt.</p>
          </div>
        )}
        {saveState === 'error' && (
          <div className="rounded-lg px-4 py-2.5 mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <p className="text-sm text-red-400">Noget gik galt. Prøv igen.</p>
          </div>
        )}

        {/* Unsubscribe */}
        <div className="rounded-xl p-5 mb-8" style={{ backgroundColor: NAVY_CARD, border: `1px solid ${NAVY_BORDER}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8BA3C7' }}>
            Afmelding
          </p>
          <p className="text-xs mb-3" style={{ color: '#4A6B8A' }}>
            Afmeld alle AISignal-emails permanent. Du kan altid melde dig til igen via aisignal.dk.
          </p>
          <button
            onClick={doUnsubscribe}
            disabled={saveState === 'saving'}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'transparent', color: '#8BA3C7', border: `1px solid ${NAVY_BORDER}` }}
            onMouseOver={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#F87171';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(248,113,113,0.4)';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#8BA3C7';
              (e.currentTarget as HTMLButtonElement).style.borderColor = NAVY_BORDER;
            }}
          >
            Afmeld alle emails
          </button>
        </div>

        <p className="text-xs text-center" style={{ color: '#2A4A6B' }}>
          © 2026 AISignal · AI-synlighedsmonitorering
        </p>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A1628' }}>
        <p className="text-sm animate-pulse" style={{ color: '#00D4FF' }}>Indlæser…</p>
      </div>
    }>
      <PreferencesContent />
    </Suspense>
  );
}
