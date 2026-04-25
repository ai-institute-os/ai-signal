'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface SubscriberInfo {
  name: string;
  email: string;
  status: string;
}

type State = 'loading' | 'ready' | 'confirming' | 'done' | 'already' | 'error';

function AfmeldContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [info, setInfo] = useState<SubscriberInfo | null>(null);
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

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
        if (data.status === 'unsubscribed') {
          setState('already');
        } else {
          setState('ready');
        }
      })
      .catch(() => {
        setState('error');
        setErrorMsg('Vi kunne ikke finde din konto. Prøv igen via linket i din email.');
      });
  }, [token]);

  async function handleConfirm() {
    if (!token) return;
    setState('confirming');

    try {
      const r = await fetch(`/api/subscribers/${encodeURIComponent(token)}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('failed');
      const data = await r.json();
      setState(data.already ? 'already' : 'done');
    } catch {
      setState('error');
      setErrorMsg('Noget gik galt. Prøv igen.');
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
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.4px' }}>AISignal</span>
        </div>

        {/* Card */}
        <div style={{ background: '#0A1628', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Top accent bar */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #00D4FF, #0099BB, transparent)' }} />

          <div style={{ padding: '40px 40px 36px' }}>
            {state === 'loading' && (
              <p style={{ color: '#4A6080', fontSize: 14, margin: 0, textAlign: 'center' }}>Henter din konto…</p>
            )}

            {state === 'ready' && info && (
              <>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>Afmelding</p>
                <h1 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: '#F0F6FF', lineHeight: 1.25, letterSpacing: '-0.5px' }}>
                  Afmeld AISignal-alerts
                </h1>
                <p style={{ margin: '0 0 28px', fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                  Du er ved at afmelde alerts for <strong style={{ color: '#E2E8F0' }}>{info.name}</strong> ({info.email}). Du modtager ikke flere emails fra AISignal.
                </p>

                <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '14px 18px', marginBottom: 28 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#FDA4AF', lineHeight: 1.6 }}>
                    Du kan til enhver tid genaktivere dine alerts via{' '}
                    <a href={`/preferences?token=${encodeURIComponent(token || '')}`} style={{ color: '#00D4FF', textDecoration: 'none' }}>dine indstillinger</a>.
                  </p>
                </div>

                <button
                  onClick={handleConfirm}
                  style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', letterSpacing: '-0.2px' }}
                >
                  Bekræft afmelding
                </button>
              </>
            )}

            {state === 'confirming' && (
              <p style={{ color: '#4A6080', fontSize: 14, margin: 0, textAlign: 'center' }}>Afmelder…</p>
            )}

            {state === 'done' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
                <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#F0F6FF' }}>Du er afmeldt</h1>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                  Du modtager ikke længere AISignal-alerts. Vi har sendt en bekræftelse til din email.
                </p>
                <a
                  href={`/preferences?token=${encodeURIComponent(token || '')}`}
                  style={{ display: 'inline-block', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Fortryd — genaktiver alerts
                </a>
              </div>
            )}

            {state === 'already' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>ℹ</div>
                <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#F0F6FF' }}>Allerede afmeldt</h1>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
                  Din konto er allerede afmeldt AISignal-alerts.
                </p>
                <a
                  href={`/preferences?token=${encodeURIComponent(token || '')}`}
                  style={{ display: 'inline-block', background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Genaktiver alerts
                </a>
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
          © 2026 AISignal · AI-synlighedsmonitorering
        </p>
      </div>
    </div>
  );
}

export default function AfmeldPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060D1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#4A6080', fontSize: 14 }}>Indlæser…</p>
      </div>
    }>
      <AfmeldContent />
    </Suspense>
  );
}
