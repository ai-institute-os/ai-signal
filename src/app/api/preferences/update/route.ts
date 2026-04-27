import { NextRequest, NextResponse } from 'next/server';
import { verifySubscriberToken } from '@/lib/auth';
import { getCompany, updateEmailPreferences, EmailPreferences } from '@/lib/db';

const VALID_CATEGORIES = ['ai-nyheder', 'produktopdateringer', 'casestudier', 'lovgivning'];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token mangler' }, { status: 400 });

  const payload = await verifySubscriberToken(token);
  if (!payload?.companyId) return NextResponse.json({ error: 'Ugyldigt token' }, { status: 401 });

  const company = await getCompany(payload.companyId);
  if (!company) return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 });

  const prefs: EmailPreferences = company.preferences_json ?? {
    categories: [...VALID_CATEGORIES],
    frequency: company.alert_frequency,
  };

  return NextResponse.json({
    email: company.email,
    categories: prefs.categories,
    frequency: prefs.frequency,
    status: company.subscriber_status,
    unsubscribed_at: company.unsubscribed_at,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token mangler' }, { status: 400 });

  const payload = await verifySubscriberToken(token);
  if (!payload?.companyId) return NextResponse.json({ error: 'Ugyldigt token' }, { status: 401 });

  const company = await getCompany(payload.companyId);
  if (!company) return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const { categories, frequency, unsubscribe } = body as {
    categories?: string[];
    frequency?: string;
    unsubscribe?: boolean;
  };

  if (unsubscribe === true) {
    await updateEmailPreferences(
      payload.companyId,
      company.preferences_json,
      new Date().toISOString()
    );
    return NextResponse.json({ ok: true, status: 'unsubscribed' });
  }

  if (categories !== undefined) {
    if (!Array.isArray(categories) || categories.some(c => !VALID_CATEGORIES.includes(c))) {
      return NextResponse.json({ error: 'Ugyldige kategorier' }, { status: 400 });
    }
  }

  if (frequency !== undefined && frequency !== 'weekly' && frequency !== 'monthly') {
    return NextResponse.json({ error: 'Ugyldig frekvens — brug weekly eller monthly' }, { status: 400 });
  }

  const current: EmailPreferences = company.preferences_json ?? {
    categories: [...VALID_CATEGORIES],
    frequency: company.alert_frequency,
  };

  const newPrefs: EmailPreferences = {
    categories: categories ?? current.categories,
    frequency: (frequency as 'weekly' | 'monthly') ?? current.frequency,
  };

  const updated = await updateEmailPreferences(payload.companyId, newPrefs, undefined);
  if (!updated) return NextResponse.json({ error: 'Opdatering mislykkedes' }, { status: 500 });

  return NextResponse.json({
    ok: true,
    categories: newPrefs.categories,
    frequency: newPrefs.frequency,
  });
}
