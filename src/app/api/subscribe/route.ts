import { NextRequest, NextResponse } from 'next/server';
import {
  createNewsletterSubscriber,
  getNewsletterSubscriberByEmail,
  updateNewsletterConfirmationToken,
} from '@/lib/db';
import { sendNewsletterConfirmationEmail } from '@/lib/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').toLowerCase().trim();
    const name = (body.name || '').trim();

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Ugyldig email-adresse.' }, { status: 400 });
    }

    const existing = await getNewsletterSubscriberByEmail(email);

    if (existing) {
      if (existing.status === 'confirmed') {
        return NextResponse.json({ ok: true, alreadyConfirmed: true });
      }
      // Pending — resend confirmation
      const freshToken = crypto.randomUUID();
      await updateNewsletterConfirmationToken(existing.id, freshToken);
      sendNewsletterConfirmationEmail(email, existing.name, freshToken).catch((e) =>
        console.error('Resend newsletter confirmation error:', e)
      );
      return NextResponse.json({ ok: true, pending: true });
    }

    const id = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    await createNewsletterSubscriber(id, email, name, confirmationToken);

    sendNewsletterConfirmationEmail(email, name, confirmationToken).catch((e) =>
      console.error('Newsletter confirmation email error:', e)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json({ error: 'Intern fejl. Prøv igen.' }, { status: 500 });
  }
}
