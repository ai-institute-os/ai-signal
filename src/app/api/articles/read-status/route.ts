import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { getReadArticleIds } from '@/lib/reading-progress';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ readIds: [] });
  }

  const readIds = await getReadArticleIds(session.companyId);
  return NextResponse.json({ readIds: Array.from(readIds) });
}
