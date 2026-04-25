import { Resend } from 'resend';
import { signSubscriberToken } from '@/lib/auth';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AISignal <alerts@aisignal.dk>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function sendEmailWithRetry(
  resend: Resend,
  payload: Parameters<Resend['emails']['send']>[0]
): Promise<void> {
  try {
    await resend.emails.send(payload);
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
    await resend.emails.send(payload);
  }
}

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

async function subscriberFooter(companyId: string): Promise<string> {
  const token = await signSubscriberToken(companyId);
  const base = BASE_URL();
  const unsubUrl = `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`;
  const prefsUrl = `${base}/preferences?token=${encodeURIComponent(token)}`;
  return `<a href="${prefsUrl}" style="color:#52525b;text-decoration:none;">Indstillinger</a> · <a href="${unsubUrl}" style="color:#52525b;text-decoration:none;">Afmeld</a>`;
}

function emailWrapper(subject: string, bodyHtml: string, footerNote: string, footerLinks?: string): string {
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
                © 2026 AISignal · AI-synlighedsmonitorering${footerLinks ? `<br><span style="margin-top:6px;display:inline-block;">${footerLinks}</span>` : ''}
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

export async function sendVerificationEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  verificationToken: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error('RESEND_API_KEY not set — skipping verification email');
    return;
  }

  const verifyUrl = `${BASE_URL()}/api/subscribers/verify?token=${encodeURIComponent(verificationToken)}`;
  const subject = `Bekræft din AISignal-tilmelding`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Bekræft din AISignal-tilmelding</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Tak fordi du tilmeldte dig AISignal.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      Klik på knappen herunder for at bekræfte din email-adresse.
    </p>
    ${ctaButton(verifyUrl, 'Bekræft email')}
    <p style="margin:24px 0 0;font-size:14px;color:#71717a;line-height:1.6;">
      Når du har bekræftet, sender vi dig en velkomst med info om, hvad du modtager fremover.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#52525b;line-height:1.6;">
      Har du ikke tilmeldt dig? Se bort fra denne email.
    </p>`;

  const html = emailWrapper(subject, body, '© 2026 AISignal · AI-synlighedsmonitorering');
  const text = `Bekræft din AISignal-tilmelding\n\nTak fordi du tilmeldte dig AISignal.\n\nKlik her for at bekræfte din email-adresse:\n${verifyUrl}\n\nNår du har bekræftet, sender vi dig en velkomst med info om, hvad du modtager fremover.\n\nHar du ikke tilmeldt dig? Se bort fra denne email.\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }
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
    console.error('RESEND_API_KEY not set — skipping alert email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = customSubject || `Vigtig ændring i din AI-synlighed — ${companyName}`;
  const textBody = structuredBody || alertMessage;
  const footerLinks = await subscriberFooter(companyId);

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

  const html = emailWrapper(subject, body, `Du modtager denne besked fordi du er tilmeldt AISignal-overvågning for ${companyName}.`, footerLinks);
  const text = `AISignal — ${subject}\n\n${textBody}\n\n© 2026 AISignal`;

  try {
    await sendEmailWithRetry(resend, { from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send alert email after retry:', err);
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
    console.error('RESEND_API_KEY not set — skipping trial welcome email');
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
    console.error('RESEND_API_KEY not set — skipping trial expired email');
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
    await sendEmailWithRetry(resend, { from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send trial expired email after retry:', err);
  }
}

export async function sendWelcomeEmail(
  toEmail: string,
  companyName: string,
  companyId: string
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error('RESEND_API_KEY not set — skipping welcome email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const subject = `Du er tilmeldt AISignal — her er hvad der sker`;
  const token = await signSubscriberToken(companyId);
  const prefsUrl = `${BASE_URL()}/preferences?token=${encodeURIComponent(token)}`;

  const body = `
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Velkommen til AISignal.</h1>
    <p style="margin:0 0 16px;font-size:15px;color:#a1a1aa;line-height:1.6;">
      Hver uge sender vi dig en kort AI-opdatering: de vigtigste bevægelser, de relevante signaler, og hvad det betyder i praksis. Ingen støj — kun det der rykker.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
      Din første alert ankommer til næste udsendelse.
    </p>
    ${ctaButton(dashboardUrl, 'Se dit dashboard →')}
    <p style="margin:24px 0 0;font-size:14px;color:#71717a;line-height:1.6;">
      Vil du ændre dine præferencer eller afmelde dig, kan du gøre det her: <a href="${prefsUrl}" style="color:#a78bfa;text-decoration:none;">Administrer indstillinger</a>
    </p>`;

  const html = emailWrapper(subject, body, '© 2026 AISignal · AI-synlighedsmonitorering');
  const text = `Du er tilmeldt AISignal — her er hvad der sker\n\nVelkommen til AISignal.\n\nHver uge sender vi dig en kort AI-opdatering: de vigtigste bevægelser, de relevante signaler, og hvad det betyder i praksis. Ingen støj — kun det der rykker.\n\nDin første alert ankommer til næste udsendelse.\n\nVil du ændre dine præferencer eller afmelde dig, kan du gøre det her: ${prefsUrl}\n\n© 2026 AISignal`;

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
    console.error('RESEND_API_KEY not set — skipping first report email');
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
    console.error('RESEND_API_KEY not set — skipping trial warning email');
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
    await sendEmailWithRetry(resend, { from: FROM_EMAIL, to: toEmail, subject, html, text });
  } catch (err) {
    console.error('Failed to send trial warning email after retry:', err);
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
    console.error('RESEND_API_KEY not set — skipping subscription activated email');
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
    console.error('RESEND_API_KEY not set — skipping upsell email');
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

type SignalLevel = 'Critical' | 'High' | 'Medium' | 'Low';

interface WeeklySignal {
  headline: string;
  consequence: string;
  level: SignalLevel;
  sourceAI: string;
}

const LEVEL_CONFIG: Record<SignalLevel, { color: string; bg: string; border: string; label: string }> = {
  Critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'KRITISK' },
  High:     { color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', label: 'HØJ' },
  Medium:   { color: '#EAB308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  label: 'MIDDEL' },
  Low:      { color: '#22C55E', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  label: 'LAV' },
};

function weeklyEmailWrapper(subject: string, bodyHtml: string, footerNote: string, footerLinks?: string): string {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#060D1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060D1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:linear-gradient(135deg,#00D4FF,#0099BB);border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                          <span style="color:#0A1628;font-weight:800;font-size:13px;">AI</span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="color:#fff;font-weight:700;font-size:17px;letter-spacing:-0.4px;">AISignal</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:0.8px;">Ugentlig rapport</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#0A1628;border:1px solid rgba(0,212,255,0.15);border-radius:16px;overflow:hidden;">

              <!-- Card top accent bar -->
              <tr>
                <td style="height:3px;background:linear-gradient(90deg,#00D4FF,#0099BB,transparent);display:block;"></td>
              </tr>

              <tr>
                <td style="padding:32px 32px 28px;">
                  ${bodyHtml}
                </td>
              </tr>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#2A3F5A;line-height:1.8;">
                ${footerNote}<br>
                © 2026 AISignal · AI-synlighedsmonitorering
                ${footerLinks ? `<br><span style="margin-top:6px;display:inline-block;">${footerLinks}</span>` : ''}
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

function weeklyCta(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#00D4FF;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#0A1628;text-decoration:none;letter-spacing:-0.2px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function levelBadge(level: SignalLevel): string {
  const cfg = LEVEL_CONFIG[level];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:0.8px;color:${cfg.color};background:${cfg.bg};border:1px solid ${cfg.border};">${cfg.label}</span>`;
}

function signalCard(s: WeeklySignal, isLast: boolean): string {
  const cfg = LEVEL_CONFIG[s.level];
  const border = isLast ? 'none' : '1px solid rgba(0,212,255,0.08)';
  return `
  <tr>
    <td style="padding:20px 0;border-bottom:${border};vertical-align:top;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:10px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align:middle;padding-right:8px;">${levelBadge(s.level)}</td>
                <td style="vertical-align:middle;">
                  <span style="font-size:11px;color:#4A6080;letter-spacing:0.4px;">${s.sourceAI}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:10px;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#E2E8F0;line-height:1.4;">${s.headline}</p>
          </td>
        </tr>
        <tr>
          <td style="background:rgba(0,212,255,0.05);border-left:3px solid ${cfg.color};border-radius:0 6px 6px 0;padding:10px 14px;">
            <p style="margin:0 0 3px;font-size:10px;color:#4A6080;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Konsekvens for dig</p>
            <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">${s.consequence}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// Sendes ugentligt når der er signifikante ændringer i AI-synlighed.
export async function sendWeeklyDigestEmail(
  toEmail: string,
  companyName: string,
  companyId: string,
  signals: Array<WeeklySignal>
): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.error('RESEND_API_KEY not set — skipping weekly digest email');
    return;
  }

  const dashboardUrl = `${BASE_URL()}/dashboard/${companyId}`;
  const count = signals.length;
  const subject = `Ugentlig AI-opdatering for ${companyName}`;

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const formatDate = (d: Date) => d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long' });
  const weekLabel = `${formatDate(weekStart)} – ${formatDate(now)}`;

  const hasCritical = signals.some(s => s.level === 'Critical');
  const hasHigh = signals.some(s => s.level === 'High');
  const urgencyColor = hasCritical ? '#EF4444' : hasHigh ? '#F97316' : '#00D4FF';
  const urgencyLabel = hasCritical ? 'Kritiske ændringer opdaget' : hasHigh ? 'Vigtige ændringer opdaget' : 'AI-position opdateret';

  const signalRows = signals
    .map((s, i) => signalCard(s, i === signals.length - 1))
    .join('');

  const samletVurdering = count === 1
    ? 'Et signal kræver din opmærksomhed denne uge.'
    : `${count} signaler kræver din opmærksomhed. Din AI-position har ændret sig på tværs af flere parametre.`;

  const body = `
    <!-- Eyebrow -->
    <p style="margin:0 0 6px;font-size:11px;color:${urgencyColor};text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">${urgencyLabel}</p>

    <!-- Headline -->
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#F0F6FF;line-height:1.25;letter-spacing:-0.5px;">
      ${count} AI-signal${count !== 1 ? 'er' : ''} for ${companyName}
    </h1>
    <p style="margin:0 0 28px;font-size:12px;color:#4A6080;">${weekLabel}</p>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="height:1px;background:rgba(0,212,255,0.12);"></td></tr>
    </table>

    <!-- Signal cards -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${signalRows}
    </table>

    <!-- Summary box -->
    <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:10px;color:#00D4FF;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Samlet vurdering</p>
      <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.6;">${samletVurdering}</p>
    </div>

    <!-- CTA -->
    ${weeklyCta(dashboardUrl, 'Se fuld analyse i dashboard →')}

    <p style="margin:18px 0 0;font-size:11px;color:#2A3F5A;line-height:1.6;">
      AISignal observerer og rapporterer — alle beslutninger er dine.
    </p>`;

  const footerLinks = await subscriberFooter(companyId);
  const html = weeklyEmailWrapper(subject, body, `Du modtager denne ugentlige rapport som AISignal-abonnent for ${companyName}.`, footerLinks);

  const textLines = signals
    .map((s) => `[${s.level}] ${s.headline}\nKilde: ${s.sourceAI}\nKonsekvens: ${s.consequence}`)
    .join('\n\n');
  const text = `Ugentlig AI-opdatering for ${companyName}\n\n${weekLabel}\n\n${textLines}\n\nSamlet vurdering: ${samletVurdering}\n\nSe fuld analyse: ${dashboardUrl}\n\n© 2026 AISignal`;

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
    console.error('RESEND_API_KEY not set — skipping subscription cancelled email');
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
