import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron: runs weekly on Monday at 08:00 UTC — see vercel.json
export const maxDuration = 300;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('weekly-newsletter cron: CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

  const response = await fetch(`${base}/api/newsletter/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
    },
  });

  const result = await response.json();
  console.log('weekly-newsletter cron result:', result);
  return NextResponse.json(result, { status: response.status });
}
