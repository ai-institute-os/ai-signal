import { SignJWT, jwtVerify } from 'jose';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = 'aisignal_session';
const JWT_EXPIRY = '30d';

export { COOKIE_NAME };

export async function signSession(companyId: string): Promise<string> {
  return new SignJWT({ companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<{ companyId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.companyId !== 'string') return null;
    return { companyId: payload.companyId };
  } catch {
    return null;
  }
}

// Subscriber management tokens (for unsubscribe/preferences links in emails)
export async function signSubscriberToken(companyId: string): Promise<string> {
  return new SignJWT({ companyId, purpose: 'subscriber' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('365d')
    .sign(getJwtSecret());
}

export async function verifySubscriberToken(token: string): Promise<{ companyId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.companyId !== 'string') return null;
    if (payload.purpose !== 'subscriber') return null;
    return { companyId: payload.companyId };
  } catch {
    return null;
  }
}

export async function signEmailChangeToken(companyId: string, newEmail: string): Promise<string> {
  return new SignJWT({ companyId, newEmail, purpose: 'email-change' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret());
}

export async function verifyEmailChangeToken(token: string): Promise<{ companyId: string; newEmail: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.companyId !== 'string') return null;
    if (typeof payload.newEmail !== 'string') return null;
    if (payload.purpose !== 'email-change') return null;
    return { companyId: payload.companyId, newEmail: payload.newEmail };
  } catch {
    return null;
  }
}
