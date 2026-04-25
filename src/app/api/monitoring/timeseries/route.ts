import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getMonitoringBySystemDay, getMonitoringByDay } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

// GET /api/monitoring/timeseries?companyId=...&days=30
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrævet.' }, { status: 400 });
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session || session.companyId !== companyId) {
      return NextResponse.json({ error: 'Ikke autoriseret.' }, { status: 401 });
    }

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
    }

    const days = Math.min(Number(searchParams.get('days') ?? '30'), 90);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [bySystemDay, byDay] = await Promise.all([
      getMonitoringBySystemDay(companyId, cutoff),
      getMonitoringByDay(companyId, cutoff),
    ]);

    const allDaysSet = new Set<string>();
    bySystemDay.forEach(r => allDaysSet.add(r.day));
    byDay.forEach(r => allDaysSet.add(r.day));
    const dates = Array.from(allDaysSet).sort();

    const systemsSet = new Set<string>();
    bySystemDay.forEach(r => systemsSet.add(r.ai_system));

    const systems: Record<string, { mentionRate: number[]; chosenRate: number[] }> = {};
    for (const system of systemsSet) {
      const dayMap = new Map<string, { total: number; mentioned: number; chosen: number }>();
      bySystemDay.filter(r => r.ai_system === system).forEach(r => dayMap.set(r.day, r));
      systems[system] = {
        mentionRate: dates.map(d => {
          const row = dayMap.get(d);
          return row ? Math.round((row.mentioned / row.total) * 100) : 0;
        }),
        chosenRate: dates.map(d => {
          const row = dayMap.get(d);
          return row ? Math.round((row.chosen / row.total) * 100) : 0;
        }),
      };
    }

    const aggMap = new Map<string, { total: number; mentioned: number; chosen: number }>();
    byDay.forEach(r => aggMap.set(r.day, r));

    return NextResponse.json({
      dates,
      systems,
      aggregated: {
        mentionRate: dates.map(d => {
          const row = aggMap.get(d);
          return row ? Math.round((row.mentioned / row.total) * 100) : 0;
        }),
        chosenRate: dates.map(d => {
          const row = aggMap.get(d);
          return row ? Math.round((row.chosen / row.total) * 100) : 0;
        }),
      },
    });
  } catch (err) {
    console.error('Timeseries error:', err);
    return NextResponse.json({ error: 'Fejl ved hentning af historikdata.' }, { status: 500 });
  }
}
