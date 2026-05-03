import { NextRequest, NextResponse } from 'next/server';
import { verifySubscriberToken, signEmailChangeToken } from '@/lib/auth';
import { getCompany, getCompanyByEmail } from '@/lib/db';
import { sendEmailChangeVerificationEmail } from '@/lib/email';

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return htmlResponse(errorPage('Ugyldigt link', 'Administreringslinket mangler en token. Brug linket fra din email.'), 400);
  }

  const payload = await verifySubscriberToken(token);
  if (!payload) {
    return htmlResponse(errorPage('Ugyldigt link', 'Linket er ugyldigt eller udløbet. Brug linket fra din email.'), 400);
  }

  const company = await getCompany(payload.companyId);
  if (!company) {
    return htmlResponse(errorPage('Ikke fundet', 'Vi kunne ikke finde din konto. Kontakt support.'), 404);
  }

  return htmlResponse(managePage(token, company.email, company.name));
}

export async function POST(req: NextRequest) {
  let token: string | null = null;
  let newEmail: string | null = null;

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await req.text();
    const params = new URLSearchParams(body);
    token = params.get('token');
    newEmail = params.get('newEmail');
  } else {
    const body = await req.json().catch(() => ({}));
    token = body.token ?? null;
    newEmail = body.newEmail ?? null;
  }

  if (!token) {
    return htmlResponse(errorPage('Ugyldigt link', 'Token mangler. Brug linket fra din email.'), 400);
  }

  const payload = await verifySubscriberToken(token);
  if (!payload) {
    return htmlResponse(errorPage('Ugyldigt link', 'Linket er ugyldigt eller udløbet.'), 400);
  }

  const company = await getCompany(payload.companyId);
  if (!company) {
    return htmlResponse(errorPage('Ikke fundet', 'Vi kunne ikke finde din konto. Kontakt support.'), 404);
  }

  const trimmedEmail = (newEmail || '').trim().toLowerCase();

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return htmlResponse(managePage(token, company.email, company.name, 'Indtast en gyldig email-adresse.'));
  }

  if (trimmedEmail === company.email.toLowerCase()) {
    return htmlResponse(managePage(token, company.email, company.name, 'Den nye adresse er den samme som den nuværende.'));
  }

  const existing = await getCompanyByEmail(trimmedEmail);
  if (existing && existing.id !== company.id) {
    return htmlResponse(managePage(token, company.email, company.name, 'Denne email-adresse er allerede i brug.'));
  }

  const changeToken = await signEmailChangeToken(company.id, trimmedEmail);
  await sendEmailChangeVerificationEmail(trimmedEmail, company.name, company.id, changeToken);

  return htmlResponse(confirmationSentPage(trimmedEmail, company.name));
}

function htmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administrer abonnement — InsideAI</title>
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
            <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:40px;">
              ${content}
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

function managePage(token: string, currentEmail: string, companyName: string, errorMsg?: string): string {
  const error = errorMsg
    ? `<p style="margin:0 0 16px;font-size:13px;color:#ef4444;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px 14px;">${errorMsg}</p>`
    : '';

  return layout(`
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#fff;">Administrer abonnement</h1>
    <p style="margin:0 0 28px;font-size:13px;color:#71717a;">
      Opdater din email-adresse for <strong style="color:#a1a1aa;">${escapeHtml(companyName)}</strong>
    </p>

    <div style="background:#27272a;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.5px;">Nuværende email</p>
      <p style="margin:0;font-size:14px;color:#d4d4d8;">${escapeHtml(currentEmail)}</p>
    </div>

    ${error}

    <form method="POST" action="${BASE_URL()}/api/subscribers/manage">
      <input type="hidden" name="token" value="${escapeAttr(token)}">
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:12px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
          Ny email-adresse
        </label>
        <input
          type="email"
          name="newEmail"
          required
          placeholder="ny@email.dk"
          style="width:100%;box-sizing:border-box;background:#09090b;border:1px solid #3f3f46;border-radius:8px;padding:10px 14px;font-size:14px;color:#fff;outline:none;"
        >
      </div>
      <button
        type="submit"
        style="background:#7c3aed;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;width:100%;"
      >
        Send bekræftelsesemail
      </button>
    </form>

    <p style="margin:20px 0 0;font-size:12px;color:#52525b;line-height:1.6;">
      Vi sender en bekræftelsesemail til den nye adresse. Ændringen træder i kraft, når du klikker på linket i den email.
    </p>
  `);
}

function confirmationSentPage(newEmail: string, companyName: string): string {
  return layout(`
    <div style="text-align:center;">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">✓</span>
      </div>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">Bekræftelsesemail sendt</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#a1a1aa;line-height:1.6;">
        Vi har sendt en bekræftelsesemail til <strong style="color:#d4d4d8;">${escapeHtml(newEmail)}</strong>.
      </p>
      <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6;">
        Klik på linket i emailen for at bekræfte ændringen. Linket er gyldigt i 24 timer.<br>
        Din nuværende email for <strong style="color:#a1a1aa;">${escapeHtml(companyName)}</strong> fortsætter uændret, indtil du bekræfter.
      </p>
    </div>
  `);
}

function errorPage(title: string, message: string): string {
  return layout(`
    <div style="text-align:center;">
      <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);margin:0 auto 20px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;">✗</span>
      </div>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(title)}</h1>
      <p style="margin:0;font-size:14px;color:#a1a1aa;line-height:1.6;">${escapeHtml(message)}</p>
    </div>
  `);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
