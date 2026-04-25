import { NextRequest, NextResponse } from 'next/server';
import { verifySubscriberToken } from '@/lib/auth';
import { getCompany, getCompanyByManagementToken, updateSubscriberPreferences } from '@/lib/db';
import { sendUnsubscribeConfirmationEmail } from '@/lib/email';

async function resolveCompany(token: string) {
  const byManagement = await getCompanyByManagementToken(token);
  if (byManagement) return byManagement;

  const payload = await verifySubscriberToken(token);
  if (payload) return getCompany(payload.companyId);

  return null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const company = await resolveCompany(token);
  if (!company) {
    return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 });
  }

  if (company.subscriber_status === 'unsubscribed') {
    return NextResponse.json({ ok: true, already: true });
  }

  await updateSubscriberPreferences(company.id, {
    subscriber_status: 'unsubscribed',
    paused_until: null,
  });

  sendUnsubscribeConfirmationEmail(company.email, company.name, company.id).catch((e) =>
    console.error('Unsubscribe confirmation email error:', e)
  );

  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const company = await resolveCompany(token);
  if (!company) {
    return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 });
  }

  return NextResponse.json({
    name: company.name,
    email: company.email,
    status: company.subscriber_status,
  });
}
