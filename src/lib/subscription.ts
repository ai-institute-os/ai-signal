import { Company } from './db';

export const FREE_TIER_SIGNAL_LIMIT = 3;

export function isPremium(company: Company): boolean {
  return company.aisignal_plan === 'premium';
}

export function getSubscriberTier(company: Company): 'free' | 'premium' {
  return company.aisignal_plan;
}

// Free users are restricted to weekly frequency only
export function isFrequencyAllowed(company: Company, frequency: 'weekly' | 'monthly'): boolean {
  if (isPremium(company)) return true;
  return frequency === 'weekly';
}
