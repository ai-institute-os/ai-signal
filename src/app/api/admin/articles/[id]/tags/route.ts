import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin-auth';
import { updateArticleTags } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  const { id } = await params;

  let tags: string[];
  try {
    const body = await req.json();
    if (!Array.isArray(body.tags) || body.tags.some((t: unknown) => typeof t !== 'string')) {
      return NextResponse.json({ error: 'tags must be an array of strings' }, { status: 400 });
    }
    tags = body.tags.map((t: string) => t.trim()).filter(Boolean);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await updateArticleTags(id, tags);
  return NextResponse.json({ ok: true, id, tags });
}
