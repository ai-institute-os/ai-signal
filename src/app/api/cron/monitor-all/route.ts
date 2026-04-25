import { NextRequest, NextResponse } from 'next/server';
import {
  getCompaniesNeedingRun,
  getExpiredTrialCompanies,
  expireTrialForCompany,
  getCompaniesWithTrialEndingInDays,
  markTrialWarningSent,
  getFreeCompaniesForUpsellEmail,
  markUpsellEmailSent,
} from '@/lib/db';
import { runMonitoringForCompany } from '@/lib/monitor';
import {
  sendTrialExpiredEmail,
  sendTrialWarningEmail,
  sendUpsellEmail,
} from '@/lib/email';

// Vercel Cron: runs daily at 08:00 UTC — see vercel.json
// Can also be triggered manually with the cron secret header.
export const maxDuration = 300; // 5 min timeout for batch runs

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Expire premium trials that have passed their end date.
  const expiredCompanies = await getExpiredTrialCompanies();
  for (const c of expiredCompanies) {
    await expireTrialForCompany(c.id);
    sendTrialExpiredEmail(c.email, c.name, c.id).catch((e) =>
      console.error(`Cron: trial expiry email failed for ${c.id}:`, e)
    );
    console.log(`Cron: trial expired for ${c.name} (${c.id})`);
  }

  // 2. Send trial warning at 10 days left (day 80 of 90).
  const warning10 = await getCompaniesWithTrialEndingInDays(10);
  for (const c of warning10) {
    sendTrialWarningEmail(c.email, c.name, c.id, 10).catch((e) =>
      console.error(`Cron: trial warning (10d) email failed for ${c.id}:`, e)
    );
    await markTrialWarningSent(c.id, 10);
    console.log(`Cron: trial warning (10d) sent for ${c.name} (${c.id})`);
  }

  // 3. Send trial final reminder at 2 days left (day 88 of 90).
  const warning2 = await getCompaniesWithTrialEndingInDays(2);
  for (const c of warning2) {
    sendTrialWarningEmail(c.email, c.name, c.id, 2).catch((e) =>
      console.error(`Cron: trial warning (2d) email failed for ${c.id}:`, e)
    );
    await markTrialWarningSent(c.id, 2);
    console.log(`Cron: trial warning (2d) sent for ${c.name} (${c.id})`);
  }

  // 4. Send upsell email to free-plan companies with enough monitoring data.
  const upsellCandidates = await getFreeCompaniesForUpsellEmail();
  for (const c of upsellCandidates) {
    sendUpsellEmail(c.email, c.name, c.id, 'lille').catch((e) =>
      console.error(`Cron: upsell email failed for ${c.id}:`, e)
    );
    await markUpsellEmailSent(c.id);
    console.log(`Cron: upsell email sent for ${c.name} (${c.id})`);
  }

  // 5. Run monitoring for companies that haven't been checked recently.
  const INTERVAL_HOURS = Number(process.env.MONITOR_INTERVAL_HOURS ?? '24');

  let companies;
  try {
    companies = await getCompaniesNeedingRun(INTERVAL_HOURS);
  } catch (err) {
    console.error('Cron: failed to fetch companies:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (companies.length === 0) {
    return NextResponse.json({
      ran: 0,
      message: 'All companies recently monitored',
      trialWarnings10: warning10.length,
      trialWarnings2: warning2.length,
      upsellSent: upsellCandidates.length,
    });
  }

  const results: { companyId: string; name: string; runId?: string; error?: string }[] = [];

  for (const company of companies) {
    try {
      const runId = await runMonitoringForCompany(company);
      results.push({ companyId: company.id, name: company.name, runId });
      console.log(`Cron: monitored ${company.name} (${company.id}), runId=${runId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Cron: failed for ${company.name}:`, err);
      results.push({ companyId: company.id, name: company.name, error: msg });
    }
  }

  const succeeded = results.filter((r) => r.runId).length;
  const failed = results.filter((r) => r.error).length;

  return NextResponse.json({
    ran: succeeded,
    failed,
    trialWarnings10: warning10.length,
    trialWarnings2: warning2.length,
    upsellSent: upsellCandidates.length,
    results,
    intervalHours: INTERVAL_HOURS,
  });
}
