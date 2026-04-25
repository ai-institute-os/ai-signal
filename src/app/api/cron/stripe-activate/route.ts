import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesReadyForStripeActivation, updateStripeCustomer, updateStripeSubscription, expireTrialForCompany } from '@/lib/db';
import { stripe, PLANS } from '@/lib/stripe';

// Runs daily to transition companies whose 90-day free trial has ended
// to a paid Stripe subscription (Mellem plan by default).
// Companies without a payment method on file are downgraded to free instead.
export async function GET(req: NextRequest) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (cronSecret !== configuredSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companies = await getCompaniesReadyForStripeActivation();
  const results: Array<{ companyId: string; outcome: string }> = [];

  for (const company of companies) {
    try {
      const mellemPriceId = PLANS.mellem.priceId;
      if (!mellemPriceId) {
        // Stripe not configured — just downgrade the trial
        await expireTrialForCompany(company.id);
        results.push({ companyId: company.id, outcome: 'downgraded_no_stripe_config' });
        continue;
      }

      // Ensure we have a Stripe customer
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

      // Check if the customer has a saved payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        // No payment method — downgrade to free
        await expireTrialForCompany(company.id);
        results.push({ companyId: company.id, outcome: 'downgraded_no_payment_method' });
        continue;
      }

      // Create subscription with existing payment method
      const defaultPm = paymentMethods.data[0].id;
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: defaultPm },
      });

      const sub = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: mellemPriceId }],
        metadata: { companyId: company.id, plan: 'mellem', source: 'auto_trial_conversion' },
      });

      await updateStripeSubscription(company.id, sub.id, sub.status, mellemPriceId, 'premium');
      results.push({ companyId: company.id, outcome: 'subscribed' });
    } catch (err) {
      console.error(`stripe-activate error for ${company.id}:`, err);
      results.push({ companyId: company.id, outcome: 'error' });
    }
  }

  return NextResponse.json({ processed: companies.length, results });
}
