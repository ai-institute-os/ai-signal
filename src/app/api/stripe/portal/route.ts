import { NextRequest, NextResponse } from 'next/server';
import { getCompany } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { COOKIE_NAME, verifySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json() as { companyId: string };

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const authSession = token ? await verifySession(token) : null;
    if (!authSession || authSession.companyId !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet' }, { status: 404 });
    }
    if (!company.stripe_customer_id) {
      return NextResponse.json({ error: 'Intet aktivt abonnement fundet' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/${companyId}`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('portal error:', err);
    return NextResponse.json({ error: 'Intern fejl' }, { status: 500 });
  }
}
