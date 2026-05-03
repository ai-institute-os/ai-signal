import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailChangeToken } from '@/lib/auth';
import { getCompany, getCompanyByEmail, updateCompany } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return htmlResponse(resultPage(false, 'Ugyldigt link', 'Bekræftelseslinket mangler en token. Prøv igen via linket i din email.'), 400);
  }

  const payload = await verifyEmailChangeToken(token);
  if (!payload) {
    return htmlResponse(resultPage(false, 'Ugyldigt eller udløbet link', 'Bekræftelseslinket er ugyldigt eller udløbet (links er gyldige i 24 timer). Gå til "Administrer abonnement" i din email for at sende et nyt link.'), 400);
  }

  const company = await getCompany(payload.companyId);
  if (!company) {
    return htmlResponse(resultPage(false, 'Ikke fundet', 'Vi kunne ikke finde din konto. Kontakt support.'), 404);
  }

  const newEmail = payload.newEmail.toLowerCase().trim();

  // Check the new email isn't already taken by someone else
  const existing = await getCompanyByEmail(newEmail);
  if (existing && existing.id !== company.id) {
    return htmlResponse(resultPage(false, 'Email allerede i brug', 'Denne email-adresse er allerede knyttet til en anden konto.'), 409);
  }

  await updateCompany(company.id, { email: newEmail });

  return htmlResponse(resultPage(true, 'Email-adresse opdateret', `Din InsideAI-email for ${escapeHtml(company.name)} er nu ændret til ${escapeHtml(newEmail)}. Fremtidige alerts sendes til den nye adresse.`));
}

function htmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function resultPage(success: boolean, title: string, message: string): string {
  const accentColor = success ? '#22c55e' : '#ef4444';
  const icon = success ? '✓' : '✗';

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — InsideAI</title>
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
                    <span style="color:#fff;font-weight:600;font-size:16px;letter-spacing:-0.3px;">InsideAI</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px;text-align:center;">
              <div style="width:48px;height:48px;border-radius:50%;background:${accentColor}20;border:1px solid ${accentColor}50;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
                <span style="font-size:24px;">${icon}</span>
              </div>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(title)}</h1>
              <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${escapeHtml(message)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#3f3f46;">© 2026 InsideAI · AI-synlighedsmonitorering</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
