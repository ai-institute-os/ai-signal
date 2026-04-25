import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveCompanies, getCompanyPeriodStats } from '@/lib/db';

// GET /api/admin/companies
// Requires x-admin-secret header matching ADMIN_SECRET env var.
// Returns all active companies with latest 7-day stats + trend vs prior week.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const companies = await getAllActiveCompanies();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const rows = await Promise.all(
      companies.map(async (c) => {
        const [latest, prev] = await Promise.all([
          getCompanyPeriodStats(c.id, sevenDaysAgo),
          getCompanyPeriodStats(c.id, fourteenDaysAgo, sevenDaysAgo),
        ]);

        const latestScore = latest.total > 0 ? Math.round(latest.avgScore ?? 0) : null;
        const prevScore = prev.total > 0 ? Math.round(prev.avgScore ?? 0) : null;
        const trend = latestScore !== null && prevScore !== null ? latestScore - prevScore : null;

        const trialActive =
          c.aisignal_plan === 'premium' &&
          !!c.trial_ends_at &&
          new Date(c.trial_ends_at) > now;
        const trialDaysLeft =
          trialActive && c.trial_ends_at
            ? Math.ceil((new Date(c.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;

        return {
          id: c.id,
          name: c.name,
          domain: c.domain,
          email: c.email,
          category: c.category,
          plan: c.aisignal_plan,
          trialActive,
          trialDaysLeft,
          trialEndsAt: c.trial_ends_at,
          stripeSubscriptionStatus: c.stripe_subscription_status,
          latestScore,
          prevScore,
          trend,
          latestMentionRate: latest.total > 0 ? Math.round((latest.mentionRate ?? 0) * 100) : null,
          latestChosenRate: latest.total > 0 ? Math.round((latest.chosenRate ?? 0) * 100) : null,
          createdAt: c.created_at,
        };
      })
    );

    return NextResponse.json({ companies: rows });
  } catch (err) {
    console.error('Admin companies error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
