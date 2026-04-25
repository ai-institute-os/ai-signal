import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getLatestRunForCompany } from '@/lib/db';
import { runMonitoringForCompany } from '@/lib/monitor';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { getSubscriberTier, FREE_TIER_SIGNAL_LIMIT } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const { companyId } = await req.json();
    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrævet.' }, { status: 400 });
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session || session.companyId !== companyId) {
      return NextResponse.json({ error: 'Ikke autoriseret.' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const { allowed, remainingMs } = checkRateLimit(`monitor-run:${ip}`);
    if (!allowed) {
      const minutes = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { error: `For mange forsøg. Prøv igen om ${minutes} minut${minutes !== 1 ? 'ter' : ''}.` },
        { status: 429 }
      );
    }

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
    }

    // Throttle: max one run per 5 minutes
    const latest = await getLatestRunForCompany(companyId);
    if (latest && latest.status !== 'failed') {
      const ageMs = Date.now() - new Date(latest.created_at + 'Z').getTime();
      if (ageMs < 5 * 60 * 1000) {
        return NextResponse.json({ runId: latest.id, throttled: true, message: 'Vent mindst 5 minutter mellem kørsler.' });
      }
    }

    const tier = getSubscriberTier(company);

    // Run async — fire and forget, return runId immediately
    const runId = await runMonitoringForCompany(company);
    return NextResponse.json({
      runId,
      throttled: false,
      tier,
      signalLimit: tier === 'free' ? FREE_TIER_SIGNAL_LIMIT : null,
    });
  } catch (err) {
    console.error('Monitor run error:', err);
    return NextResponse.json({ error: 'Fejl ved start af monitorering.' }, { status: 500 });
  }
}
