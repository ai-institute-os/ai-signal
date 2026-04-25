import { NextRequest, NextResponse } from 'next/server';
import { getCompany, updateStripeCustomer } from '@/lib/db';
import { stripe, PLANS, PlanKey } from '@/lib/stripe';
import { COOKIE_NAME, verifySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { companyId, plan } = await req.json() as { companyId: string; plan: PlanKey };

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const authSession = token ? await verifySession(token) : null;
    if (!authSession || authSession.companyId !== companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const planConfig = PLANS[plan];
    if (!planConfig || planConfig.key === 'lille') {
      return NextResponse.json({ error: 'Ugyldig pakke' }, { status: 400 });
    }
    if (!planConfig.priceId) {
      return NextResponse.json({ error: 'Stripe pris-ID ikke konfigureret for denne pakke' }, { status: 503 });
    }

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

    // Create or reuse Stripe customer
    let customerId = company.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: { companyId: company.id },
      });
      customerId = customer.id;
      await updateStripeCustomer(company.id, customerId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard/${companyId}?checkout=success&plan=${plan}`,
      cancel_url: `${baseUrl}/dashboard/${companyId}/upgrade?checkout=cancelled`,
      subscription_data: {
        metadata: { companyId: company.id, plan },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout error:', err);
    return NextResponse.json({ error: 'Intern fejl' }, { status: 500 });
  }
}
