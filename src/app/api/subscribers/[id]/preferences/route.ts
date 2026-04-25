import { NextRequest, NextResponse } from 'next/server';
import { verifySubscriberToken } from '@/lib/auth';
import { updateSubscriberPreferences, getCompany } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Auth: require subscriber token in Authorization header or query param
  const authHeader = req.headers.get('authorization');
  const queryToken = req.nextUrl.searchParams.get('token');
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;

  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenPayload = await verifySubscriberToken(rawToken);
  if (!tokenPayload || tokenPayload.companyId !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const company = await getCompany(id);
  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const VALID_BRANCHER = ['finans', 'HR', 'marketing', 'produktion', 'IT', 'sundhed', 'detail', 'andet'];
  const VALID_AI_EMNER = ['generativ AI', 'automation', 'data-analyse', 'AI-etik', 'computer vision', 'NLP'];

  const { frequency, status, pause_days, branche, ai_emner } = body as {
    frequency?: string;
    status?: string;
    pause_days?: number;
    branche?: string;
    ai_emner?: string[];
  };

  const update: Parameters<typeof updateSubscriberPreferences>[1] = {};

  if (frequency !== undefined) {
    if (frequency !== 'weekly' && frequency !== 'monthly') {
      return NextResponse.json({ error: 'frequency must be weekly or monthly' }, { status: 400 });
    }
    update.alert_frequency = frequency;
  }

  if (status !== undefined) {
    if (!['active', 'paused', 'unsubscribed'].includes(status)) {
      return NextResponse.json({ error: 'status must be active, paused, or unsubscribed' }, { status: 400 });
    }
    update.subscriber_status = status as 'active' | 'paused' | 'unsubscribed';

    if (status === 'paused') {
      const days = typeof pause_days === 'number' && pause_days > 0 ? pause_days : 30;
      update.paused_until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    } else if (status === 'active' || status === 'unsubscribed') {
      update.paused_until = null;
    }
  }

  if (branche !== undefined) {
    if (branche !== '' && !VALID_BRANCHER.includes(branche)) {
      return NextResponse.json({ error: 'Ugyldig branche' }, { status: 400 });
    }
    update.branche = branche;
  }

  if (ai_emner !== undefined) {
    if (!Array.isArray(ai_emner) || ai_emner.length > 3 || ai_emner.some(t => !VALID_AI_EMNER.includes(t))) {
      return NextResponse.json({ error: 'ai_emner skal være max 3 gyldige emner' }, { status: 400 });
    }
    update.ai_emner = ai_emner;
  }

  const updated = await updateSubscriberPreferences(id, update);
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    frequency: updated.alert_frequency,
    status: updated.subscriber_status,
    paused_until: updated.paused_until,
    branche: updated.branche,
    ai_emner: updated.ai_emner,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authHeader = req.headers.get('authorization');
  const queryToken = req.nextUrl.searchParams.get('token');
  const rawToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : queryToken;

  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenPayload = await verifySubscriberToken(rawToken);
  if (!tokenPayload || tokenPayload.companyId !== id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const company = await getCompany(id);
  if (!company) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: company.id,
    email: company.email,
    name: company.name,
    frequency: company.alert_frequency,
    status: company.subscriber_status,
    paused_until: company.paused_until,
    branche: company.branche,
    ai_emner: company.ai_emner,
  });
}
