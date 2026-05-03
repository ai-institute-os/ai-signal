import { redirect } from 'next/navigation';
import { getCompany } from '@/lib/db';

export default async function BekraeftetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company || !company.email_verified) {
    redirect('/');
  }

  const dashboardUrl = `/dashboard/${company.id}`;

  // Calculate next Monday for first report estimate
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday
  const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  const nextReportDate = nextMonday.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      style={{
        background: '#09090b',
        minHeight: '100vh',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                background: '#7c3aed',
                borderRadius: 8,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>AI</span>
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '-0.3px' }}>
              InsideAI
            </span>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: 16,
            padding: 40,
          }}
        >
          {/* Success icon */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <h1
            style={{
              margin: '0 0 8px',
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            Email bekræftet!
          </h1>
          <p
            style={{
              margin: '0 0 28px',
              fontSize: 14,
              color: '#a1a1aa',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            InsideAI overvåger nu{' '}
            <strong style={{ color: '#d4d4d8' }}>{company.name}</strong> på tværs af ChatGPT,
            Gemini og Perplexity.
          </p>

          {/* First report info box */}
          <div
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 24,
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 11,
                color: '#a78bfa',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
              }}
            >
              Første rapport
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#d4d4d8', lineHeight: 1.6 }}>
              Din første AI-analyse er igangsat og klar inden for de næste par minutter. Du modtager
              derefter ugentlige rapporter — næste aflevering er{' '}
              <strong style={{ color: '#fff' }}>{nextReportDate}</strong>.
            </p>
          </div>

          {/* What happens next */}
          <div style={{ marginBottom: 28 }}>
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                color: '#52525b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Hvad sker der nu
            </p>
            {[
              {
                icon: '🔍',
                text: 'Vi analyserer, om ChatGPT, Gemini og Perplexity nævner og vælger din virksomhed',
              },
              {
                icon: '📬',
                text: 'Du modtager resultatet direkte i din indbakke — ingen login nødvendig',
              },
              {
                icon: '📊',
                text: 'Ugentlig baseline bygges op, så du kan se din position over tid',
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: i < 2 ? '1px solid #27272a' : 'none',
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>{item.icon}</span>
                <p style={{ margin: 0, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href={dashboardUrl}
            style={{
              display: 'block',
              background: '#7c3aed',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 24px',
              borderRadius: 8,
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Gå til dit dashboard →
          </a>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 11,
            color: '#3f3f46',
          }}
        >
          © 2026 InsideAI · AI-synlighedsmonitorering
        </p>
      </div>
    </div>
  );
}
