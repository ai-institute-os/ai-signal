import { NextRequest, NextResponse } from 'next/server';
import { verifySubscriberToken } from '@/lib/auth';
import { getCompany, getCompanyByEmail, getCompanyByManagementToken, updateCompany } from '@/lib/db';
import { sendEmailUpdatedOldAddressNotification, sendEmailUpdatedNewAddressConfirmation } from '@/lib/email';

async function resolveCompany(token: string) {
  const byManagement = await getCompanyByManagementToken(token);
  if (byManagement) return byManagement;

  const payload = await verifySubscriberToken(token);
  if (payload) return getCompany(payload.companyId);

  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const company = await resolveCompany(token);
  if (!company) {
    return NextResponse.json({ error: 'Ikke fundet' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const newEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: 'Ugyldig email-adresse' }, { status: 400 });
  }

  if (newEmail === company.email.toLowerCase()) {
    return NextResponse.json({ error: 'Den nye adresse er den samme som den nuværende' }, { status: 400 });
  }

  const existing = await getCompanyByEmail(newEmail);
  if (existing && existing.id !== company.id) {
    return NextResponse.json({ error: 'Denne email-adresse er allerede i brug' }, { status: 409 });
  }

  const oldEmail = company.email;
  await updateCompany(company.id, { email: newEmail });

  sendEmailUpdatedOldAddressNotification(oldEmail, newEmail, company.name).catch((e) =>
    console.error('Email update old address notification error:', e)
  );
  sendEmailUpdatedNewAddressConfirmation(newEmail, company.name, company.id).catch((e) =>
    console.error('Email update new address confirmation error:', e)
  );

  return NextResponse.json({ ok: true, email: newEmail });
}
