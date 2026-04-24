import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

export type PlanKey = 'lille' | 'mellem' | 'stor';

export interface PlanConfig {
  key: PlanKey;
  name: string;
  priceId: string | null;
  amount: number; // øre (DKK * 100)
  currency: string;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  lille: {
    key: 'lille',
    name: 'Lille',
    priceId: null, // free, no Stripe price
    amount: 0,
    currency: 'dkk',
  },
  mellem: {
    key: 'mellem',
    name: 'Mellem',
    priceId: process.env.STRIPE_PRICE_MELLEM ?? null,
    amount: 99700, // 997 kr
    currency: 'dkk',
  },
  stor: {
    key: 'stor',
    name: 'Stor',
    priceId: process.env.STRIPE_PRICE_STOR ?? null,
    amount: 249700, // 2.497 kr
    currency: 'dkk',
  },
};

export function getPlanByPriceId(priceId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) return key as PlanKey;
  }
  return null;
}
