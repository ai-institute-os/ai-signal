import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createCompany, getDb } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { name, domain, email, category, competitors, country, password } = await req.json();

    if (!name || !domain || !email || !category || !country || !password) {
      return NextResponse.json(
        { error: 'Manglende felter: name, domain, email, category, country, password er påkrævet.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Adgangskode skal være mindst 8 tegn.' },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const existing = getDb()
      .prepare('SELECT id FROM companies WHERE email = ?')
      .get(emailLower) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json({ companyId: existing.id, existing: true });
    }

    const id = uuidv4();
    const competitorList: string[] = Array.isArray(competitors)
      ? competitors.filter((c: unknown) => typeof c === 'string' && c.trim())
      : [];

    createCompany(
      id,
      name.trim(),
      domain.trim().toLowerCase(),
      emailLower,
      category.trim(),
      competitorList,
      country.trim(),
      password
    );

    // Fire-and-forget welcome email
    sendWelcomeEmail(emailLower, name.trim(), id).catch((e) => console.error('Welcome email error:', e));

    return NextResponse.json({ companyId: id, existing: false }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Intern fejl ved oprettelse.' }, { status: 500 });
  }
}
