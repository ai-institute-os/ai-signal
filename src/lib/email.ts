import { Resend } from 'resend';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AISignal <alerts@aisignal.dk>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';
  const dashboardUrl = `${baseUrl}/dashboard/${companyId}`;

  const subject = customSubject || `Vigtig ændring i din AI-synlighed — ${companyName}`;
  const textBody = structuredBody || alertMessage;

  // Convert structured text body to simple HTML paragraphs
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

  const html = `
<!DOCTYPE html>
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
          <!-- Header -->
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

          <!-- Alert card -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:32px;">
              <p style="margin:0 0 8px;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;">
                Vigtig ændring
              </p>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#fff;line-height:1.3;">
                ${subject}
              </h1>

              <!-- Alert message box -->
              <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
                ${htmlBody}
              </div>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#7c3aed;border-radius:8px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">
                      Se dit dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
                Du modtager denne besked fordi du er tilmeldt AISignal-overvågning for ${companyName}.
                <br>
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

  const text = `AISignal — ${subject}\n\n${textBody}\n\n© 2026 AISignal`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('Failed to send alert email:', err);
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';
  const dashboardUrl = `${baseUrl}/dashboard/${companyId}`;

  const html = `
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">
                Velkommen til AISignal 👋
              </h1>
              <p style="margin:0 0 8px;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Overvågning af <strong style="color:#d4d4d8;">${companyName}</strong> er nu aktiv.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                Vi sender automatisk prompts til AI-systemer og måler om din virksomhed nævnes og vælges.
                Din første analyse er klar om få minutter.
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

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#7c3aed;border-radius:8px;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;">
                      Se dit dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">
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

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `AISignal er aktiv for ${companyName}`,
      html,
      text: `Velkommen til AISignal!\n\nOvervågning af ${companyName} er nu aktiv. Se dit dashboard: ${dashboardUrl}`,
    });
  } catch (err) {
    console.error('Failed to send welcome email:', err);
  }
}
