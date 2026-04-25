import { NextRequest, NextResponse } from 'next/server';
import {
  getNewsletterSubscriberById,
  logEmail,
  scheduleEmail,
} from '@/lib/db';
import { sendNewsletterWelcome1 } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { subscriberId } = await req.json();

    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriberId required' }, { status: 400 });
    }

    const subscriber = await getNewsletterSubscriberById(subscriberId);
    if (!subscriber) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    if (subscriber.status !== 'confirmed') {
      return NextResponse.json({ error: 'Subscriber not confirmed' }, { status: 400 });
    }

    // Send Email 1 immediately
    await sendNewsletterWelcome1(subscriber.email, subscriber.name, subscriber.id);
    await logEmail(crypto.randomUUID(), subscriber.id, 'welcome_1');

    // Schedule Email 2 for day 3 (72 hours)
    const day3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await scheduleEmail(crypto.randomUUID(), subscriber.id, 'welcome_2', day3);

    // Schedule Email 3 for day 7 (168 hours)
    const day7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await scheduleEmail(crypto.randomUUID(), subscriber.id, 'welcome_3', day7);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Welcome series error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
