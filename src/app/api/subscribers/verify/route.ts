import { NextRequest, NextResponse } from 'next/server';
import { getCompanyByVerificationToken, verifyCompanyEmail } from '@/lib/db';
import { signSession, COOKIE_NAME } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${BASE_URL()}/?verify=missing`);
  }

  const company = await getCompanyByVerificationToken(token);

  if (!company) {
    return NextResponse.redirect(`${BASE_URL()}/?verify=invalid`);
  }

  // Check token is not older than 24 hours
  const createdAt = new Date(company.created_at).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - createdAt > TWENTY_FOUR_HOURS) {
    return NextResponse.redirect(`${BASE_URL()}/?verify=expired`);
  }

  await verifyCompanyEmail(company.id);

  // Trigger first monitoring run in background
  fetch(`${BASE_URL()}/api/monitor/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId: company.id }),
  }).catch((e) => console.error('First monitoring run error after verify:', e));

  sendWelcomeEmail(company.email, company.name, company.id).catch((e) =>
    console.error('Welcome email error after verify:', e)
  );

  const sessionToken = await signSession(company.id);
  const res = NextResponse.redirect(`${BASE_URL()}/dashboard/${company.id}`);
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
