import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCompanyByEmail, updateCompanyPassword } from '@/lib/db';
import { signSession, COOKIE_NAME } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';

  let email: string;
  let password: string;

  try {
    ({ email, password } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Ugyldigt request.' }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email og adgangskode er påkrævet.' }, { status: 400 });
  }

  const rateLimitKey = `login:${ip}:${email.toLowerCase().trim()}`;
  const { allowed, remainingMs } = checkRateLimit(rateLimitKey);

  if (!allowed) {
    const minutes = Math.ceil(remainingMs / 60000);
    return NextResponse.json(
      { error: `For mange forsøg. Prøv igen om ${minutes} minut${minutes !== 1 ? 'ter' : ''}.` },
      { status: 429 }
    );
  }

  const company = await getCompanyByEmail(email);

  if (!company) {
    // Constant-time response to prevent email enumeration
    await bcrypt.compare(password, '$2b$10$invalidhashpadding.topreventusernameenumeration');
    return NextResponse.json({ error: 'Forkert email eller adgangskode.' }, { status: 401 });
  }

  let passwordValid = false;

  if (company.password.startsWith('$2')) {
    // bcrypt hash
    passwordValid = await bcrypt.compare(password, company.password);
  } else {
    // Legacy plaintext — verify and rehash
    passwordValid = company.password === password;
    if (passwordValid) {
      const hashed = await bcrypt.hash(password, 12);
      await updateCompanyPassword(company.id, hashed);
    }
  }

  if (!passwordValid) {
    return NextResponse.json({ error: 'Forkert email eller adgangskode.' }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);

  const token = await signSession(company.id);

  const res = NextResponse.json({ companyId: company.id });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return res;
}
