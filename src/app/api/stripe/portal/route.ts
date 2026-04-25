import { NextRequest, NextResponse } from 'next/server';
import { getCompany } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json() as { companyId: string };

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet' }, { status: 404 });
    }
    if (!company.stripe_customer_id) {
      return NextResponse.json({ error: 'Intet aktivt abonnement fundet' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/${companyId}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('portal error:', err);
    return NextResponse.json({ error: 'Intern fejl' }, { status: 500 });
  }
}
