import { NextRequest, NextResponse } from 'next/server';
import {
  getCompanyByVerificationToken,
  verifyCompanyEmail,
  getNewsletterSubscriberByToken,
  confirmNewsletterSubscriber,
} from '@/lib/db';
import { signSession, COOKIE_NAME } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/email';
import { runMonitoringForCompany } from '@/lib/monitor';

const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  if (!token) {
    return NextResponse.redirect(`${BASE_URL()}/confirm?status=error&reason=missing`);
  }

  // Newsletter subscriber confirmation flow
  if (type === 'newsletter') {
    const subscriber = await getNewsletterSubscriberByToken(token);
    if (!subscriber) {
      return NextResponse.redirect(`${BASE_URL()}/tilmeldt?status=error&reason=invalid`);
    }

    if (subscriber.status === 'confirmed') {
      return NextResponse.redirect(`${BASE_URL()}/tilmeldt?status=already_confirmed`);
    }

    await confirmNewsletterSubscriber(subscriber.id);

    // Trigger welcome series
    const baseUrl = BASE_URL();
    fetch(`${baseUrl}/api/email/welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriberId: subscriber.id }),
    }).catch((e) => console.error('Welcome series trigger error:', e));

    return NextResponse.redirect(`${BASE_URL()}/tilmeldt?status=success`);
  }

  // Existing company email verification flow
  const company = await getCompanyByVerificationToken(token);

  if (!company) {
    return NextResponse.redirect(`${BASE_URL()}/confirm?status=error&reason=invalid`);
  }

  const createdAt = new Date(company.created_at).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - createdAt > TWENTY_FOUR_HOURS) {
    return NextResponse.redirect(`${BASE_URL()}/confirm?status=error&reason=expired`);
  }

  await verifyCompanyEmail(company.id);

  runMonitoringForCompany(company).catch((e) =>
    console.error('First monitoring run error after confirm:', e)
  );

  sendWelcomeEmail(company.email, company.name, company.id).catch((e) =>
    console.error('Welcome email error after confirm:', e)
  );

  const sessionToken = await signSession(company.id);
  const res = NextResponse.redirect(`${BASE_URL()}/confirm?status=success&id=${company.id}`);
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
