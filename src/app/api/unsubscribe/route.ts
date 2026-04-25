import { NextRequest, NextResponse } from 'next/server';
import { verifySubscriberToken } from '@/lib/auth';
import { updateSubscriberPreferences, getCompany } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse(confirmationPage('Ugyldigt link', 'Afmeldingslinket mangler en token. Prøv igen via linket i din email.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const payload = await verifySubscriberToken(token);
  if (!payload) {
    return new NextResponse(confirmationPage('Ugyldigt link', 'Linket er ugyldigt eller udløbet. Prøv igen via linket i din email.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const company = await getCompany(payload.companyId);
  if (!company) {
    return new NextResponse(confirmationPage('Ikke fundet', 'Vi kunne ikke finde din konto. Kontakt support.', false), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (company.subscriber_status === 'unsubscribed') {
    return new NextResponse(
      confirmationPage('Allerede afmeldt', `${company.email} er allerede afmeldt AISignal-alerts.`, true),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  await updateSubscriberPreferences(payload.companyId, {
    subscriber_status: 'unsubscribed',
    paused_until: null,
  });

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';
  const prefsUrl = `${BASE_URL}/preferences?token=${encodeURIComponent(token)}`;

  return new NextResponse(
    confirmationPage(
      'Du er afmeldt',
      `Du er nu afmeldt AISignal-alerts for <strong>${company.name}</strong>.<br><br>Vi er kede af at se dig gå.`,
      true,
      prefsUrl
    ),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function confirmationPage(title: string, message: string, success: boolean, prefsUrl?: string): string {
  const accentColor = success ? '#22c55e' : '#ef4444';
  const resubscribeSection = prefsUrl
    ? `<p style="margin:24px 0 0;font-size:13px;color:#71717a;">
        Fortrudt? Du kan ændre dine præferencer eller genaktivere alerts via
        <a href="${prefsUrl}" style="color:#8b5cf6;text-decoration:none;">dine indstillinger</a>.
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — AISignal</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:80px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
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
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px;text-align:center;">
              <div style="width:48px;height:48px;border-radius:50%;background:${accentColor}20;border:1px solid ${accentColor}50;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:24px;">${success ? '✓' : '✗'}</span>
              </div>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">${title}</h1>
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${message}</p>
              ${resubscribeSection}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">© 2026 AISignal · AI-synlighedsmonitorering</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
