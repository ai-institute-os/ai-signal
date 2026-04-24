import { Resend } from 'resend';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AISignal <alerts@aisignal.dk>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

function emailWrapper(subject: string, bodyHtml: string, footerNote: string): string {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#7c3aed;border-radius:8px;width:28px;height:28px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-weight:700;font-size:12px;">AI</span>
                  </td>
                  <td style="padding-left:8px;">
                    <span style="color:#fff;font-weight:600;font-size:16px;letter-spacing:-0.3px;">AISignal</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                ${footerNote}<br>
                © 2026 AISignal · AI-synlighedsmonitorering
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#7c3aed;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─── EXISTING FUNCTIONS ────────────────────────────────────────────────────────

export async function sendAlertEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  alertType: string,
  alertMessage: string,
  customSubject?: string,
  structuredBody?: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping alert email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = customSubject || `Vigtig ændring i din AI-synlighed — ${companyName}`;
  const textBody = structuredBody || alertMessage;

  const htmlBody = textBody
    .split('\n')
    .map(line => {
      if (line.startsWith('EMNE:') || line.startsWith('HVA SKER:') || line.startsWith('TALLENE:') || line.startsWith('HVORNÅR:') || line.startsWith('SE I DASHBOARD:')) {
        return `<p style="margin:0 0 4px;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">${line}</p>`;
      } else if (line === '---') {
        return '<hr style="border:none;border-top:1px solid #27272a;margin:16px 0;">';
      } else if (line.trim() === '') {
        return '<br>';
      } else if (line.startsWith('http')) {
        return `<p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;"><a href="${line}" style="color:#8b5cf6;">${line}</a></p>`;
      } else {
        return `<p style="margin:0 0 8px;font-size:14px;color:#d4d4d8;line-height:1.6;">${line}</p>`;
      }
    })
    .join('');

  const body = `
    <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Vigtig ændring</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">${subject}</h1>
    <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      ${htmlBody}
    </div>
    ${ctaButton(dashboardUrl, 'Se dit dashboard →')}`;

  const html = emailWrapper(subject, body, `Du modtager denne besked fordi du er tilmeldt AISignal-overvågning for ${companyName}.`);
  const text = `AISignal — ${subject}\n\n${textBody}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send alert email:', err);
  }
}

export async function sendTrialWelcomeEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  password: string,
  trialEndsAt: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping trial welcome email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const trialEndFormatted = new Date(trialEndsAt).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  const subject = `3 måneder gratis AISignal Premium — din konto er klar`;

  const body = `
    <p style="margin:0 0 4px;font-size:12px;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">3 måneder gratis · Premium Trial</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Velkommen til AISignal, ${companyName}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Som AIScore-kunde har du fået <strong style="color:#d4d4d8;">3 måneder gratis AISignal Premium</strong>. Vi overvåger automatisk om din virksomhed nævnes og vælges af AI-systemer — og sender dig alerts ved vigtige ændringer.
    </p>
    <div style="background:#27272a;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Dine login-oplysninger</p>
      <p style="margin:0 0 4px;font-size:13px;color:#a1a1aa;">Email: <strong style="color:#d4d4d8;">${toEmail}</strong></p>
      <p style="margin:0;font-size:13px;color:#a1a1aa;">Adgangskode: <strong style="color:#d4d4d8;">${password}</strong></p>
    </div>
    <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#a78bfa;text-transform:uppercase;letter-spacing:0.5px;">Premium-periode</p>
      <p style="margin:0;font-size:14px;color:#d4d4d8;">Gratis adgang til og med <strong>${trialEndFormatted}</strong></p>
    </div>
    ${ctaButton(dashboardUrl, 'Åbn dit dashboard →')}`;

  const html = emailWrapper(subject, body, '© 2026 AISignal · AI-synlighedsmonitorering');
  const text = `Velkommen til AISignal Premium!\n\nSom AIScore-kunde har du 3 måneder gratis adgang til og med ${trialEndFormatted}.\n\nLogin:\nEmail: ${toEmail}\nAdgangskode: ${password}\n\nDashboard: ${dashboardUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send trial welcome email:', err);
  }
}

export async function sendTrialExpiredEmail(
  toEmail: string,
  companyName: string,
  companyId: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping trial expired email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = `Din gratis AISignal Premium-periode er udløbet — ${companyName}`;

  const body = `
    <p style="margin:0 0 4px;font-size:12px;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Din gratis periode er udløbet</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Din AISignal Premium-trial er slut</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Din 3-måneders gratis AISignal Premium-adgang for <strong style="color:#d4d4d8;">${companyName}</strong> er nu udløbet. Din konto er skiftet til gratis-planen.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Vil du fortsætte med fuld AI-synlighedsovervågning, alerts og premium-funktioner? Kontakt os for at opgradere.
    </p>
    ${ctaButton(dashboardUrl, 'Se dit dashboard →')}`;

  const html = emailWrapper(subject, body, `© 2026 AISignal · AI-synlighedsmonitorering`);
  const text = `Din AISignal Premium-trial for ${companyName} er nu udløbet.\n\nDin konto er skiftet til gratis-planen. Kontakt os for at opgradere og fortsætte med fuld overvågning.\n\nDashboard: ${dashboardUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send trial expired email:', err);
  }
}

export async function sendWelcomeEmail(
  toEmail: string,
  companyName: string,
  companyId: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = `AISignal er aktiv for ${companyName}`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Velkommen til AISignal</h1>
    <p style="margin:0 0 8px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Overvågning af <strong style="color:#d4d4d8;">${companyName}</strong> er nu aktiv.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      Vi sender automatisk prompts til AI-systemer og måler om din virksomhed nævnes og vælges. Din første analyse er klar om få minutter.
    </p>
    <div style="background:#27272a;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Hvad sker der nu</p>
      <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#a1a1aa;line-height:1.8;">
        <li>Vi stiller strukturerede prompts til ChatGPT om din virksomhed</li>
        <li>Vi måler om du nævnes og vælges</li>
        <li>Du får automatisk alerts ved vigtige ændringer</li>
        <li>Overvågning kører automatisk — du behøver ikke gøre noget</li>
      </ul>
    </div>
    ${ctaButton(dashboardUrl, 'Se dit dashboard →')}`;

  const html = emailWrapper(subject, body, '© 2026 AISignal · AI-synlighedsmonitorering');
  const text = `Velkommen til AISignal!\n\nOvervågning af ${companyName} er nu aktiv. Se dit dashboard: ${dashboardUrl}`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send welcome email:', err);
  }
}

// ─── NYE FUNKTIONER ────────────────────────────────────────────────────────────

// Sendes efter første gennemførte monitoring-kørsel.
export async function sendFirstReportReadyEmail(
  toEmail: string,
  companyName: string,
  companyId: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping first report email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = `Din første AI-analyse er klar — ${companyName}`;

  const body = `
    <p style="margin:0 0 4px;font-size:12px;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Første analyse klar</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Her er hvad AI siger om ${companyName}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      AISignal har nu gennemført sin første analyse. Vi har stillet strukturerede prompts til ChatGPT, Gemini og Perplexity og målt, hvordan AI-systemer aktuelt opfatter og beskriver din virksomhed.
    </p>
    <div style="background:#27272a;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Dit dashboard viser</p>
      <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#a1a1aa;line-height:1.8;">
        <li>Om din virksomhed nævnes i AI-svar</li>
        <li>Om du aktivt vælges frem for konkurrenter</li>
        <li>Hvilken tone og position AI associerer med dit brand</li>
        <li>Forskelle på tværs af AI-systemer</li>
      </ul>
    </div>
    ${ctaButton(dashboardUrl, 'Se analysen →')}`;

  const html = emailWrapper(subject, body, `Du modtager denne besked som AISignal-bruger for ${companyName}.`);
  const text = `Din første AI-analyse er klar.\n\nAISignal har målt, hvordan ChatGPT, Gemini og Perplexity aktuelt opfatter ${companyName}.\n\nSe resultatet i dit dashboard: ${dashboardUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send first report email:', err);
  }
}

// Sendes på dag 80 (daysLeft=10) og dag 88 (daysLeft=2) af trial-perioden.
export async function sendTrialWarningEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  daysLeft: number
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping trial warning email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const upgradeUrl = `${BASE_URL()}/dashboard/${companyId}/upgrade`;

  const isUrgent = daysLeft <= 2;
  const subject = isUrgent
    ? `Kun ${daysLeft} dage tilbage — aktiver dit AISignal-abonnement`
    : `Din gratis adgang udløber om ${daysLeft} dage — ${companyName}`;

  const accentColor = isUrgent ? '#ef4444' : '#f59e0b';
  const labelText = isUrgent ? 'Udløber meget snart' : 'Husk at aktivere';

  const body = `
    <p style="margin:0 0 4px;font-size:12px;color:${accentColor};text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${labelText}</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">
      ${isUrgent ? `Kun ${daysLeft} dage tilbage` : `Din gratis adgang udløber om ${daysLeft} dage`}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Din gratis AISignal Premium-adgang for <strong style="color:#d4d4d8;">${companyName}</strong> udløber om ${daysLeft} ${daysLeft === 1 ? 'dag' : 'dage'}. Når perioden slutter, skifter din konto automatisk til gratis-planen.
    </p>
    <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12px;color:#a78bfa;text-transform:uppercase;letter-spacing:0.5px;">Premium inkluderer</p>
      <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#d4d4d8;line-height:1.8;">
        <li>Daglig overvågning på tværs af ChatGPT, Gemini og Perplexity</li>
        <li>Automatiske alerts ved vigtige ændringer i din AI-position</li>
        <li>Konkurrentovervågning og trend-analyse</li>
        <li>Fuld historik og eksport</li>
      </ul>
    </div>
    ${ctaButton(upgradeUrl, 'Aktiver abonnement →')}
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">
      Eller <a href="${dashboardUrl}" style="color:#a78bfa;text-decoration:none;">se dit dashboard</a> for at gennemgå dine resultater inden perioden slutter.
    </p>`;

  const html = emailWrapper(subject, body, `Du modtager denne besked fordi din AISignal-trial for ${companyName} nærmer sig sin udløbsdato.`);
  const text = `AISignal — ${subject}\n\nDin gratis adgang udløber om ${daysLeft} dage.\n\nAktiver abonnement: ${upgradeUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send trial warning email:', err);
  }
}

// Sendes når Stripe-abonnement aktiveres (customer.subscription.created/updated → active).
export async function sendSubscriptionActivatedEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  planName: string,
  amountDkk: number
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping subscription activated email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = `Abonnement aktiveret — AISignal ${planName}`;
  const amountFormatted = `${(amountDkk / 100).toLocaleString('da-DK')} kr./md.`;
  const dateFormatted = new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });

  const body = `
    <p style="margin:0 0 4px;font-size:12px;color:#22c55e;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Aktiveret</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Dit AISignal-abonnement er aktivt</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Abonnementet for <strong style="color:#d4d4d8;">${companyName}</strong> er nu aktiveret. Fuld AI-synlighedsovervågning kører videre uden afbrydelse.
    </p>
    <div style="background:#27272a;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Kvittering</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#a1a1aa;padding:4px 0;">Plan</td>
          <td style="font-size:13px;color:#d4d4d8;text-align:right;">AISignal ${planName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#a1a1aa;padding:4px 0;">Beløb</td>
          <td style="font-size:13px;color:#d4d4d8;text-align:right;">${amountFormatted}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#a1a1aa;padding:4px 0;">Aktiveringsdato</td>
          <td style="font-size:13px;color:#d4d4d8;text-align:right;">${dateFormatted}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#a1a1aa;padding:4px 0;">Virksomhed</td>
          <td style="font-size:13px;color:#d4d4d8;text-align:right;">${companyName}</td>
        </tr>
      </table>
    </div>
    ${ctaButton(dashboardUrl, 'Gå til dashboard →')}`;

  const html = emailWrapper(subject, body, `Kvittering sendt til ${toEmail}.`);
  const text = `Abonnement aktiveret — AISignal ${planName}\n\nPlan: AISignal ${planName}\nBeløb: ${amountFormatted}\nDato: ${dateFormatted}\nVirksomhed: ${companyName}\n\nDashboard: ${dashboardUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send subscription activated email:', err);
  }
}

// Sendes til free-plan brugere der har nok data til at se udbyttet af Premium.
export async function sendUpsellEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  fromPlan: 'lille' | 'mellem'
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping upsell email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const upgradeUrl = `${BASE_URL()}/dashboard/${companyId}/upgrade`;

  const isLilleTilMellem = fromPlan === 'lille';

  const subject = isLilleTilMellem
    ? `Se hvad du går glip af — AISignal Premium for ${companyName}`
    : `Udvid din AI-overvågning — AISignal Stor for ${companyName}`;

  const headline = isLilleTilMellem
    ? 'Din AI-position overvåges. Men ikke fuldt ud.'
    : 'Du overvåger din position. Konkurrenterne overvåges ikke.'

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">${headline}</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      ${isLilleTilMellem
        ? `AISignal sporer aktuelt ${companyName} på den gratis plan — én ugentlig analyse. Premium giver daglig overvågning, automatiske alerts og konkurrentsporing, så du opdager ændringer i din AI-position, før de påvirker dit salg.`
        : `AISignal Stor giver dig et komplet konkurrentbillede. Ud over fuld overvågning af ${companyName} spores og sammenlignes dine primære konkurrenter systematisk — uge for uge.`}
    </p>
    <div style="background:#27272a;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">
        ${isLilleTilMellem ? 'Hvad Premium tilføjer' : 'Hvad Stor tilføjer'}
      </p>
      <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#a1a1aa;line-height:1.8;">
        ${isLilleTilMellem ? `
          <li>Daglig overvågning — ikke ugentlig</li>
          <li>Automatiske alerts ved vigtige ændringer</li>
          <li>Konkurrentovervågning på tværs af AI-systemer</li>
          <li>Fuld historik og trend-analyse</li>
        ` : `
          <li>Systematisk konkurrentsporing uge for uge</li>
          <li>Direkte sammenligning: dig vs. konkurrenterne</li>
          <li>Tidlig varsling når konkurrenter styrker deres position</li>
          <li>Udvidet historik og eksport</li>
        `}
      </ul>
    </div>
    ${ctaButton(upgradeUrl, isLilleTilMellem ? 'Opgrader til Premium →' : 'Opgrader til Stor →')}
    <p style="margin:16px 0 0;font-size:13px;color:#71717a;">
      Spørgsmål? Svar direkte på denne email.
    </p>`;

  const html = emailWrapper(subject, body, `Du modtager denne besked som AISignal-bruger for ${companyName}.`);
  const text = `${subject}\n\n${headline}\n\nOpgrader her: ${upgradeUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send upsell email:', err);
  }
}

// Sendes ugentligt når der er signifikante ændringer i AI-synlighed.
export async function sendWeeklyDigestEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  signals: Array<{ headline: string; consequence: string }>
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping weekly digest email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const count = signals.length;
  const subject = `⚡ ${companyName}: ${count} ny${count !== 1 ? 'e' : 't'} AI-signal${count !== 1 ? 'er' : ''} du bør reagere på`;

  const signalRows = signals
    .map(
      (s) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #27272a;vertical-align:top;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#d4d4d8;">${s.headline}</p>
        <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">${s.consequence}</p>
      </td>
    </tr>`
    )
    .join('');

  const body = `
    <p style="margin:0 0 4px;font-size:12px;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Ugentlig AI-rapport</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">
      ${count} ny${count !== 1 ? 'e' : 't'} AI-signal${count !== 1 ? 'er' : ''} for ${companyName}
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      AISignal har registreret ændringer i hvordan AI-systemer opfatter og anbefaler din virksomhed. Her er hvad det betyder for dig.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${signalRows}
    </table>
    ${ctaButton(dashboardUrl, 'Se fuldt dashboard →')}
    <p style="margin:16px 0 0;font-size:12px;color:#3f3f46;line-height:1.6;">
      AISignal observerer og rapporterer — alle beslutninger er dine.
    </p>`;

  const html = emailWrapper(subject, body, `Du modtager denne ugentlige rapport som AISignal-abonnent for ${companyName}.`);

  const textLines = signals.map((s) => `• ${s.headline}\n  → ${s.consequence}`).join('\n\n');
  const text = `⚡ ${subject}\n\n${textLines}\n\nSe dashboard: ${dashboardUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send weekly digest email:', err);
  }
}

// Sendes når Stripe-abonnement annulleres (customer.subscription.deleted).
export async function sendSubscriptionCancelledEmail(
  toEmail: string,
  companyName: string,
  companyId: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('RESEND_API_KEY not set — skipping subscription cancelled email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = `Dit AISignal-abonnement er annulleret — ${companyName}`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Abonnement annulleret</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Abonnementet for <strong style="color:#d4d4d8;">${companyName}</strong> er nu annulleret. Din konto skifter til gratis-planen, og du mister adgangen til daglig overvågning og alerts.
    </p>
    <div style="background:#27272a;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">Et hurtigt spørgsmål</p>
      <p style="margin:0;font-size:14px;color:#d4d4d8;line-height:1.6;">
        Vi vil gerne forstå, hvad der fik dig til at stoppe. Hvad kunne vi have gjort bedre? Svar direkte på denne email — det tager under et minut og hjælper os med at forbedre produktet.
      </p>
    </div>
    <p style="margin:0 0 20px;font-size:14px;color:#a1a1aa;line-height:1.6;">
      Hvis du fortryder, kan du til enhver tid genetablere abonnementet fra dit dashboard.
    </p>
    ${ctaButton(dashboardUrl, 'Gå til dashboard →')}`;

  const html = emailWrapper(subject, body, `Bekræftelse sendt til ${toEmail}.`);
  const text = `Abonnement annulleret — ${companyName}\n\nDit AISignal-abonnement er nu annulleret. Din konto er skiftet til gratis-planen.\n\nHvad kunne vi have gjort bedre? Svar direkte på denne email.\n\nGenopret abonnement: ${dashboardUrl}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send subscription cancelled email:', err);
  }
}
