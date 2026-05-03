import { NextRequest, NextResponse } from 'next/server';
import { getCompanyByVerificationToken, verifyCompanyEmail } from '@/lib/db';
import { signSession, COOKIE_NAME } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { runMonitoringForCompany } from '@/lib/monitor';

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return htmlError('Ugyldigt link', 'Bekræftelseslinket mangler en token. Brug linket fra din email eller tilmeld dig igen.', 400);
  }

  const company = await getCompanyByVerificationToken(token);

  if (!company) {
    return htmlError(
      'Link allerede brugt eller ugyldigt',
      'Dette bekræftelseslink er allerede brugt eller ugyldigt. Hvis din email er bekræftet, kan du logge ind. Ellers kan du tilmelde dig igen.',
      400
    );
  }

  // Check token is not older than 24 hours
  const createdAt = new Date(company.created_at).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - createdAt > TWENTY_FOUR_HOURS) {
    return htmlError(
      'Linket er udløbet',
      'Bekræftelseslinket er udløbet — det er gyldigt i 24 timer. Tilmeld dig igen på forsiden for at modtage et nyt link.',
      400
    );
  }

  await verifyCompanyEmail(company.id);

  // Trigger first monitoring run directly — not via HTTP so auth is not needed
  runMonitoringForCompany(company).catch((e) =>
    console.error('First monitoring run error after verify:', e)
  );

  sendWelcomeEmail(company.email, company.name, company.id).catch((e) =>
    console.error('Welcome email error after verify:', e)
  );

  const sessionToken = await signSession(company.id);
  const res = NextResponse.redirect(`${BASE_URL()}/bekraeftet/${company.id}`);
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}

function htmlError(title: string, message: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
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
              <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);margin:0 auto 20px;display:inline-flex;align-items:center;justify-content:center;">
                <span style="font-size:24px;color:#ef4444;">✗</span>
              </div>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(title)}</h1>
              <p style="margin:0 0 28px;font-size:14px;color:#a1a1aa;line-height:1.6;">${escapeHtml(message)}</p>
              <a href="${BASE_URL()}/#signup" style="display:inline-block;background:#7c3aed;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
                Tilmeld dig igen
              </a>
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

  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
