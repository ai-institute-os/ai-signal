'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface SubscriberInfo {
  name: string;
  email: string;
  status: string;
}

type State = 'loading' | 'ready' | 'submitting' | 'done' | 'error';

function OpdaterEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [info, setInfo] = useState<SubscriberInfo | null>(null);
  const [state, setState] = useState<State>('loading');
  const [newEmail, setNewEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [updatedEmail, setUpdatedEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('Ugyldigt link. Brug linket fra din email.');
      return;
    }

    fetch(`/api/subscribers/${encodeURIComponent(token)}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data: SubscriberInfo) => {
        setInfo(data);
        setState('ready');
      })
      .catch(() => {
        setState('error');
        setErrorMsg('Vi kunne ikke finde din konto. Prøv igen via linket i din email.');
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError('');

    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError('Indtast en gyldig email-adresse.');
      return;
    }
    if (info && trimmed === info.email.toLowerCase()) {
      setFieldError('Den nye adresse er den samme som den nuværende.');
      return;
    }

    setState('submitting');

    try {
      const r = await fetch(`/api/subscribers/${encodeURIComponent(token || '')}/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        setState('ready');
        setFieldError(data.error || 'Noget gik galt. Prøv igen.');
        return;
      }

      const data = await r.json();
      setUpdatedEmail(data.email || trimmed);
      setState('done');
    } catch {
      setState('ready');
      setFieldError('Noget gik galt. Prøv igen.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#060D1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ background: 'linear-gradient(135deg, #00D4FF, #0099BB)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#0A1628', fontWeight: 800, fontSize: 13 }}>AI</span>
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.4px' }}>InsideAI</span>
        </div>

        {/* Card */}
        <div style={{ background: '#0A1628', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Top accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #00D4FF, #0099BB, transparent)' }} />

          <div style={{ padding: '40px 40px 36px' }}>
            {state === 'loading' && (
              <p style={{ color: '#4A6080', fontSize: 14, margin: 0, textAlign: 'center' }}>Henter din konto…</p>
            )}

            {(state === 'ready' || state === 'submitting') && info && (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#00D4FF', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Opdater email</p>
                <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#F0F6FF', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                  Skift email-adresse
                </h1>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                  Opdater email-adressen for <strong style={{ color: '#E2E8F0' }}>{info.name}</strong>.
                </p>

                {/* Current email */}
                <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nuværende email</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#94A3B8' }}>{info.email}</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, color: '#4A6080', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Ny email-adresse
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => { setNewEmail(e.target.value); setFieldError(''); }}
                      placeholder="ny@email.dk"
                      disabled={state === 'submitting'}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        background: '#060D1A',
                        border: fieldError ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(0,212,255,0.2)',
                        borderRadius: 8,
                        padding: '11px 14px',
                        fontSize: 14,
                        color: '#E2E8F0',
                        outline: 'none',
                      }}
                    />
                    {fieldError && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#EF4444' }}>{fieldError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={state === 'submitting'}
                    style={{
                      background: '#00D4FF',
                      color: '#0A1628',
                      border: 'none',
                      borderRadius: 8,
                      padding: '13px 28px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: state === 'submitting' ? 'not-allowed' : 'pointer',
                      width: '100%',
                      letterSpacing: '-0.2px',
                      opacity: state === 'submitting' ? 0.7 : 1,
                    }}
                  >
                    {state === 'submitting' ? 'Opdaterer…' : 'Opdater email-adresse'}
                  </button>
                </form>

                <p style={{ margin: '16px 0 0', fontSize: 12, color: '#2A3F5A', lineHeight: 1.6 }}>
                  Vi sender en bekræftelse til den nye adresse og en notifikation til den nuværende adresse.
                </p>
              </>
            )}

            {state === 'done' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
                <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#F0F6FF' }}>Email opdateret</h1>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                  Din email-adresse er nu ændret til:
                </p>
                <p style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 600, color: '#00D4FF' }}>{updatedEmail}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#4A6080', lineHeight: 1.6 }}>
                  Vi har sendt bekræftelse til den nye adresse og besked til den gamle.
                </p>
              </div>
            )}

            {state === 'error' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✗</div>
                <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#F0F6FF' }}>Ugyldigt link</h1>
                <p style={{ margin: 0, fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>{errorMsg}</p>
              </div>
            )}
          </div>
        </div>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: '#2A3F5A' }}>
          © 2026 InsideAI · AI-synlighedsmonitorering
        </p>
      </div>
    </div>
  );
}

export default function OpdaterEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#4A6080', fontSize: 14 }}>Indlæser…</p>
      </div>
    }>
      <OpdaterEmailContent />
    </Suspense>
  );
}
