import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getLatestRunForCompany } from '@/lib/db';
import { runMonitoringForCompany } from '@/lib/monitor';

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrævet.' }, { status: 400 });
    }

    const company = getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
    }

    // Throttle: max one run per 5 minutes
    const latest = getLatestRunForCompany(companyId);
    if (latest && latest.status !== 'failed') {
      const ageMs = Date.now() - new Date(latest.created_at + 'Z').getTime();
      if (ageMs < 5 * 60 * 1000) {
        return NextResponse.json({ runId: latest.id, throttled: true, message: 'Vent mindst 5 minutter mellem kørsler.' });
      }
    }

    // Run async — fire and forget, return runId immediately
    const runId = await runMonitoringForCompany(company);
    return NextResponse.json({ runId, throttled: false });
  } catch (err) {
    console.error('Monitor run error:', err);
    return NextResponse.json({ error: 'Fejl ved start af monitorering.' }, { status: 500 });
  }
}
