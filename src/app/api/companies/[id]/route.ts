import { NextRequest, NextResponse } from 'next/server';
import { getCompany, updateCompany } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

async function authorize(req: NextRequest, id: string): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  return session?.companyId === id;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await authorize(req, id))) {
    return NextResponse.json({ error: 'Ikke autoriseret.' }, { status: 401 });
  }
  const company = getCompany(id);
  if (!company) {
    return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
  }
  const { password: _pw, ...safe } = company;
  void _pw;
  return NextResponse.json(safe);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!(await authorize(req, id))) {
    return NextResponse.json({ error: 'Ikke autoriseret.' }, { status: 401 });
  }
  const company = getCompany(id);
  if (!company) {
    return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ['name', 'domain', 'email', 'category', 'country', 'competitors'] as const;
  const fields: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) fields[key] = body[key];
  }

  const updated = updateCompany(id, fields as Parameters<typeof updateCompany>[1]);
  if (!updated) {
    return NextResponse.json({ error: 'Opdatering fejlede.' }, { status: 500 });
  }
  const { password: _pw, ...safe } = updated;
  void _pw;
  return NextResponse.json(safe);
}
