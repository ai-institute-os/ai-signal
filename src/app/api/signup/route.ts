import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { createCompany, getCompanyByEmail } from '@/lib/db';
import { sendVerificationEmail } from '@/lib/email';

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
    const existing = await getCompanyByEmail(emailLower);

    if (existing) {
      if (!existing.email_verified) {
        // Resend verification email for pending accounts
        const token = existing.verification_token;
        if (token) {
          sendVerificationEmail(emailLower, existing.name, existing.id, token).catch((e) =>
            console.error('Resend verification email error:', e)
          );
        }
        return NextResponse.json({ pending: true, existing: true });
      }
      return NextResponse.json({ companyId: existing.id, existing: true });
    }

    const id = uuidv4();
    const verificationToken = uuidv4();
    const competitorList: string[] = Array.isArray(competitors)
      ? competitors.filter((c: unknown) => typeof c === 'string' && c.trim())
      : [];

    const hashedPassword = await bcrypt.hash(password, 12);

    await createCompany(
      id,
      name.trim(),
      domain.trim().toLowerCase(),
      emailLower,
      category.trim(),
      competitorList,
      country.trim(),
      hashedPassword,
      verificationToken
    );

    sendVerificationEmail(emailLower, name.trim(), id, verificationToken).catch((e) =>
      console.error('Verification email error:', e)
    );

    return NextResponse.json({ pending: true, existing: false }, { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Intern fejl ved oprettelse.' }, { status: 500 });
  }
}
