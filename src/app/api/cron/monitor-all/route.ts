import { NextRequest, NextResponse } from 'next/server';
import { getCompaniesNeedingRun } from '@/lib/db';
import { runMonitoringForCompany } from '@/lib/monitor';

// Vercel Cron: runs daily at 08:00 UTC — see vercel.json
// Can also be triggered manually with the cron secret header.
export const maxDuration = 300; // 5 min timeout for batch runs

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const INTERVAL_HOURS = Number(process.env.MONITOR_INTERVAL_HOURS ?? '24');

  let companies;
  try {
    companies = getCompaniesNeedingRun(INTERVAL_HOURS);
  } catch (err) {
    console.error('Cron: failed to fetch companies:', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  if (companies.length === 0) {
    return NextResponse.json({ ran: 0, message: 'All companies recently monitored' });
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
    results,
    intervalHours: INTERVAL_HOURS,
  });
}
