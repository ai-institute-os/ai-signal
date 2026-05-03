import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAllConfirmedNewsletterSubscribers } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export const maxDuration = 120;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function buildNewsletterHtml(subject: string, body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n')
    .map(line => (line.trim() === '' ? '<br>' : `<p style="margin:0 0 12px 0;">${line}</p>`))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0A0F1E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0F1E;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <a href="https://aisignal.dk" style="text-decoration:none;">
                <span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                  <span style="color:#00D4FF;">AI</span><span style="color:#E8E8F0;">Signal</span>
                </span>
              </a>
            </td>
          </tr>
          <!-- Subject line -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #1E2A3A;">
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#E8E8F0;line-height:1.3;">${subject}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 0;color:#B0B8C8;font-size:15px;line-height:1.7;">
              ${escaped}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding-top:8px;border-top:1px solid #1E2A3A;">
              <p style="margin:20px 0 0 0;font-size:12px;color:#4A5568;text-align:center;">
                Du modtager dette nyhedsbrev fordi du har tilmeldt dig InsideAI.<br>
                <a href="https://aisignal.dk" style="color:#00D4FF;text-decoration:none;">aisignal.dk</a>
                &nbsp;·&nbsp;
                <a href="https://aisignal.dk/afmeld" style="color:#4A5568;text-decoration:none;">Afmeld</a>
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

export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY er ikke konfigureret.' }, { status: 503 });
  }

  let subject: string;
  let body: string;
  try {
    const payload = await req.json();
    subject = (payload.subject ?? '').trim();
    body = (payload.body ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Ugyldigt JSON.' }, { status: 400 });
  }

  if (!subject || !body) {
    return NextResponse.json({ error: 'subject og body er påkrævet.' }, { status: 400 });
  }

  const subscribers = await getAllConfirmedNewsletterSubscribers();
  if (subscribers.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, total: 0, message: 'Ingen bekræftede subscribers.' });
  }

  const html = buildNewsletterHtml(subject, body);
  const from = 'InsideAI <signal@aiscore.dk>';

  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    try {
      await resend.emails.send({ from, to: sub.email, subject, html });
      sent++;
    } catch (err) {
      console.error(`Admin send-newsletter: failed for ${sub.email}:`, err);
      failed++;
    }
  }

  console.log(`Admin send-newsletter: sent=${sent} failed=${failed} total=${subscribers.length}`);
  return NextResponse.json({ sent, failed, total: subscribers.length });
}
