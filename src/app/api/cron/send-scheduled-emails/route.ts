import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingScheduledEmails,
  getNewsletterSubscriberById,
  markScheduledEmailSent,
  markScheduledEmailFailed,
  logEmail,
} from '@/lib/db';
import { sendNewsletterWelcome2, sendNewsletterWelcome3 } from '@/lib/email';

// Vercel Cron: runs every hour — see vercel.json
export const maxDuration = 60;

const EMAIL_SENDERS: Record<
  string,
  (email: string, name: string, subscriberId: string) => Promise<void>
> = {
  welcome_2: sendNewsletterWelcome2,
  welcome_3: sendNewsletterWelcome3,
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('send-scheduled-emails cron: CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const pending = await getPendingScheduledEmails(now);

  let sent = 0;
  let failed = 0;

  for (const job of pending) {
    const sender = EMAIL_SENDERS[job.email_type];
    if (!sender) {
      console.error(`No sender for email_type: ${job.email_type}`);
      await markScheduledEmailFailed(job.id);
      failed++;
      continue;
    }

    const subscriber = await getNewsletterSubscriberById(job.subscriber_id);
    if (!subscriber || subscriber.status !== 'confirmed') {
      await markScheduledEmailFailed(job.id);
      failed++;
      continue;
    }

    try {
      await sender(subscriber.email, subscriber.name, subscriber.id);
      await logEmail(crypto.randomUUID(), subscriber.id, job.email_type);
      await markScheduledEmailSent(job.id);
      sent++;
    } catch (err) {
      console.error(`Failed to send ${job.email_type} to ${subscriber.email}:`, err);
      await markScheduledEmailFailed(job.id);
      failed++;
    }
  }

  console.log(`send-scheduled-emails: sent=${sent} failed=${failed}`);
  return NextResponse.json({ ok: true, sent, failed });
}
