import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveCompanies, getCompany, getLatestRunForCompany, getRunCount, updateSubscriberPreferences } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';
import { runMonitoringForCompany } from '@/lib/monitor';

// GET /api/admin/subscribers
// Returns all subscribers (all statuses) with plan, signup date, latest run, and report count.
export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  try {
    const companies = await getAllActiveCompanies();

    const rows = await Promise.all(
      companies.map(async (c) => {
        const [latestRun, reportCount] = await Promise.all([
          getLatestRunForCompany(c.id),
          getRunCount(c.id),
        ]);

        return {
          id: c.id,
          email: c.email,
          name: c.name,
          domain: c.domain,
          plan: c.aisignal_plan,
          subscriberStatus: c.subscriber_status,
          signupDate: c.created_at,
          latestReportAt: latestRun?.created_at ?? null,
          latestReportStatus: latestRun?.status ?? null,
          reportCount,
        };
      })
    );

    rows.sort((a, b) => new Date(b.signupDate).getTime() - new Date(a.signupDate).getTime());

    return NextResponse.json({ subscribers: rows });
  } catch (err) {
    console.error('Admin subscribers GET error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}

// POST /api/admin/subscribers
// Body: { action: 'trigger' | 'deactivate', companyId: string }
export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  try {
    const { action, companyId } = await req.json();

    if (!companyId || typeof companyId !== 'string') {
      return NextResponse.json({ error: 'companyId er påkrævet.' }, { status: 400 });
    }

    if (action === 'trigger') {
      const company = await getCompany(companyId);
      if (!company) {
        return NextResponse.json({ error: 'Abonnent ikke fundet.' }, { status: 404 });
      }
      const runId = await runMonitoringForCompany(company);
      return NextResponse.json({ ok: true, runId });
    }

    if (action === 'deactivate') {
      await updateSubscriberPreferences(companyId, { subscriber_status: 'unsubscribed' });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Ukendt handling.' }, { status: 400 });
  } catch (err) {
    console.error('Admin subscribers POST error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
