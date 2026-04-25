import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, getPlanByPriceId, PLANS } from '@/lib/stripe';
import {
  getCompanyByStripeCustomerId,
  updateStripeSubscription,
  cancelStripeSubscription,
} from '@/lib/db';
import { sendSubscriptionActivatedEmail, sendSubscriptionCancelledEmail } from '@/lib/email';

// Must be raw body for Stripe signature verification
export const dynamic = 'force-dynamic';

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook ikke konfigureret' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig ?? '', webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Ugyldig signatur' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpserted(sub, event.type === 'customer.subscription.created');
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('Payment failed for customer:', invoice.customer);
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler fejl' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionUpserted(sub: Stripe.Subscription, isNew: boolean) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const company = await getCompanyByStripeCustomerId(customerId);
  if (!company) {
    console.warn('No company found for Stripe customer:', customerId);
    return;
  }

  const priceId = sub.items.data[0]?.price?.id ?? '';
  const planKey = getPlanByPriceId(priceId);
  const plan = planKey && planKey !== 'lille' ? 'premium' : 'free';

  await updateStripeSubscription(company.id, sub.id, sub.status, priceId, plan);

  // Send activation email when a new active subscription is created.
  if (isNew && sub.status === 'active' && planKey && planKey !== 'lille') {
    const planConfig = PLANS[planKey];
    sendSubscriptionActivatedEmail(
      company.email,
      company.name,
      company.id,
      planConfig.name,
      planConfig.amount
    ).catch((e) => console.error('Subscription activated email error:', e));
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const company = await getCompanyByStripeCustomerId(customerId);
  if (!company) return;

  await cancelStripeSubscription(company.id);

  sendSubscriptionCancelledEmail(company.email, company.name, company.id).catch((e) =>
    console.error('Subscription cancelled email error:', e)
  );
}
