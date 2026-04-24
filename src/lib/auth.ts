import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'aisignal-dev-secret-change-in-production-32chars'
);

const COOKIE_NAME = 'aisignal_session';
const JWT_EXPIRY = '30d';

export { COOKIE_NAME };

export async function signSession(companyId: string): Promise<string> {
  return new SignJWT({ companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifySession(token: string): Promise<{ companyId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (typeof payload.companyId !== 'string') return null;
    return { companyId: payload.companyId };
  } catch {
    return null;
  }
}
