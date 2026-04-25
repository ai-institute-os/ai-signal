'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const BRANCHER = ['finans', 'HR', 'marketing', 'produktion', 'IT', 'sundhed', 'detail', 'andet'] as const;
const AI_EMNER = ['generativ AI', 'automation', 'data-analyse', 'AI-etik', 'computer vision', 'NLP'] as const;

interface Prefs {
  id: string;
  email: string;
  name: string;
  frequency: 'weekly' | 'monthly';
  status: 'active' | 'paused' | 'unsubscribed';
  paused_until: string | null;
  branche: string;
  ai_emner: string[];
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function PreferencesContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [branche, setBranche] = useState('');
  const [aiEmner, setAiEmner] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    if (!token) {
      setError('Ugyldigt link. Brug linket fra din email.');
      setLoading(false);
      return;
    }

    async function fetchPrefs() {
      let companyId: string;
      try {
        const parts = token!.split('.');
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        companyId = payload.companyId;
      } catch {
        setError('Ugyldigt link. Brug linket fra din email.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/subscribers/${companyId}/preferences?token=${encodeURIComponent(token!)}`, {
        method: 'GET',
      });

      if (!res.ok) {
        setError('Kunne ikke hente dine indstillinger. Prøv igen via linket i din email.');
        setLoading(false);
        return;
      }

      const data: Prefs = await res.json();
      setPrefs(data);
      setFrequency(data.frequency);
      setBranche(data.branche || '');
      setAiEmner(data.ai_emner || []);
      setLoading(false);
    }

    fetchPrefs();
  }, [token]);

  async function save(updates: { frequency?: string; status?: string; pause_days?: number; branche?: string; ai_emner?: string[] }) {
    if (!prefs || !token) return;
    setSaveState('saving');

    const res = await fetch(`/api/subscribers/${prefs.id}/preferences?token=${encodeURIComponent(token)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
      return;
    }

    const updated: Prefs = await res.json();
    setPrefs(updated);
    setFrequency(updated.frequency);
    setBranche(updated.branche || '');
    setAiEmner(updated.ai_emner || []);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  }

  function toggleAiEmne(emne: string) {
    if (aiEmner.includes(emne)) {
      setAiEmner(aiEmner.filter(e => e !== emne));
    } else if (aiEmner.length < 3) {
      setAiEmner([...aiEmner, emne]);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Henter dine indstillinger…</p>
      </div>
    );
  }

  if (error || !prefs) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✗</span>
          </div>
          <h1 className="text-white font-bold text-xl mb-2">Ugyldigt link</h1>
          <p className="text-zinc-400 text-sm">{error || 'Noget gik galt.'}</p>
        </div>
      </div>
    );
  }

  const isUnsubscribed = prefs.status === 'unsubscribed';
  const isPaused = prefs.status === 'paused';
  const pausedUntilFormatted = prefs.paused_until
    ? new Date(prefs.paused_until).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-16">
      <div className="max-w-md mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">AI</span>
          </div>
          <span className="text-white font-semibold text-base">AISignal</span>
        </div>

        <h1 className="text-white font-bold text-2xl mb-1">Email-præferencer</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Administrer dine AISignal-alerts for <span className="text-zinc-200">{prefs.name}</span>
        </p>

        {/* Current email */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">Email</p>
          <p className="text-zinc-200 text-sm">{prefs.email}</p>
        </div>

        {/* Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Status</p>
          {isUnsubscribed ? (
            <div>
              <p className="text-red-400 text-sm mb-3">Du er afmeldt AISignal-alerts.</p>
              <button
                onClick={() => save({ status: 'active' })}
                disabled={saveState === 'saving'}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saveState === 'saving' ? 'Gemmer…' : 'Genaktiver alerts'}
              </button>
            </div>
          ) : isPaused ? (
            <div>
              <p className="text-yellow-400 text-sm mb-1">
                Alerts er sat på pause til {pausedUntilFormatted}.
              </p>
              <p className="text-zinc-500 text-xs mb-3">Du modtager ingen emails i pausen.</p>
              <button
                onClick={() => save({ status: 'active' })}
                disabled={saveState === 'saving'}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saveState === 'saving' ? 'Gemmer…' : 'Genoptag alerts nu'}
              </button>
            </div>
          ) : (
            <p className="text-green-400 text-sm">Aktiv — du modtager alerts.</p>
          )}
        </div>

        {/* Frequency */}
        {!isUnsubscribed && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Frekvens</p>
            <div className="flex gap-2">
              {(['weekly', 'monthly'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFrequency(f);
                    save({ frequency: f });
                  }}
                  disabled={saveState === 'saving'}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                    frequency === f
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {f === 'weekly' ? 'Ugentlig' : 'Månedlig'}
                </button>
              ))}
            </div>
            <p className="text-zinc-600 text-xs mt-2">
              {frequency === 'weekly'
                ? 'Du modtager alerts én gang om ugen.'
                : 'Du modtager alerts én gang om måneden.'}
            </p>
          </div>
        )}

        {/* Branche */}
        {!isUnsubscribed && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <p className="text-zinc-500 text-xs uppercase tracking-wide mb-3">Din branche</p>
            <select
              value={branche}
              onChange={(e) => setBranche(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-violet-500 transition-colors"
            >
              <option value="">Vælg branche…</option>
              {BRANCHER.map((b) => (
                <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
              ))}
            </select>
            <p className="text-zinc-600 text-xs mt-2">
              Bruges til at tilpasse rapporten til din branche.
            </p>
            {branche !== (prefs.branche || '') && (
              <button
                onClick={() => save({ branche })}
                disabled={saveState === 'saving'}
                className="mt-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saveState === 'saving' ? 'Gemmer…' : 'Gem branche'}
              </button>
            )}
          </div>
        )}

        {/* AI-emner */}
        {!isUnsubscribed && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-zinc-500 text-xs uppercase tracking-wide">AI-emner</p>
              <p className="text-zinc-600 text-xs">{aiEmner.length}/3 valgt</p>
            </div>
            <div className="space-y-2">
              {AI_EMNER.map((emne) => {
                const checked = aiEmner.includes(emne);
                const disabled = !checked && aiEmner.length >= 3;
                return (
                  <label
                    key={emne}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-violet-600/10 border-violet-600/40 text-zinc-200'
                        : disabled
                        ? 'bg-zinc-800/40 border-zinc-800 text-zinc-600 cursor-not-allowed'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleAiEmne(emne)}
                      className="accent-violet-600 w-4 h-4 flex-shrink-0"
                    />
                    <span className="text-sm">{emne}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-zinc-600 text-xs mt-2">Vælg op til 3 emner du vil have fokus på.</p>
            {JSON.stringify(aiEmner.slice().sort()) !== JSON.stringify((prefs.ai_emner || []).slice().sort()) && (
              <button
                onClick={() => save({ ai_emner: aiEmner })}
                disabled={saveState === 'saving'}
                className="mt-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saveState === 'saving' ? 'Gemmer…' : 'Gem emner'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        {!isUnsubscribed && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 space-y-3">
            <p className="text-zinc-500 text-xs uppercase tracking-wide">Handlinger</p>
            {!isPaused && (
              <button
                onClick={() => save({ status: 'paused', pause_days: 30 })}
                disabled={saveState === 'saving'}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 transition-colors"
              >
                Sæt pause i 30 dage
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('Er du sikker på, at du vil afmelde AISignal-alerts?')) {
                  save({ status: 'unsubscribed' });
                }
              }}
              disabled={saveState === 'saving'}
              className="w-full bg-zinc-800 hover:bg-red-900/30 border border-zinc-700 hover:border-red-800 text-zinc-400 hover:text-red-400 text-sm font-medium py-2.5 px-4 rounded-lg disabled:opacity-50 transition-colors"
            >
              Afmeld alle alerts
            </button>
          </div>
        )}

        {/* Save feedback */}
        {saveState === 'saved' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2.5 mb-4">
            <p className="text-green-400 text-sm">Indstillinger gemt.</p>
          </div>
        )}
        {saveState === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 mb-4">
            <p className="text-red-400 text-sm">Noget gik galt. Prøv igen.</p>
          </div>
        )}

        <p className="text-zinc-600 text-xs text-center">© 2026 AISignal · AI-synlighedsmonitorering</p>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 text-sm">Indlæser…</p>
      </div>
    }>
      <PreferencesContent />
    </Suspense>
  );
}
