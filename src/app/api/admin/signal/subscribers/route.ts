import { NextRequest, NextResponse } from 'next/server';
import { getAllConfirmedNewsletterSubscribers } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  try {
    const subscribers = await getAllConfirmedNewsletterSubscribers();
    return NextResponse.json({ subscribers });
  } catch (err) {
    console.error('Admin signal subscribers GET error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
