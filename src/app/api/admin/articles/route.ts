import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { getAllArticles } from '@/lib/db';

export async function GET(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const articles = await getAllArticles();
  return NextResponse.json({ articles });
}
