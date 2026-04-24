import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getCompany, getCompanyByEmail, activateAISignalPremiumTrial, createCompany } from '@/lib/db';
import { sendTrialWelcomeEmail } from '@/lib/email';

// Called after AIScore review call to grant 3-month free premium trial on AISignal.
// If the company does not yet have an AISignal account it is created automatically.
// Requires ADMIN_SECRET header to prevent unauthorized access.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { companyId, email, name, domain, contactName } = await req.json();

    let company = null;
    if (companyId) {
      company = getCompany(companyId);
    } else if (email) {
      company = getCompanyByEmail(email);
    }

    let created = false;

    if (!company) {
      // Auto-create an AISignal account for the AIScore customer.
      if (!email || !name) {
        return NextResponse.json(
          { error: 'Virksomhed ikke fundet. Angiv email og name for at oprette en ny konto.' },
          { status: 404 }
        );
      }

      // Generate a random 12-character password.
      const password = Array.from({ length: 12 }, () =>
        'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#'[
          Math.floor(Math.random() * 57)
        ]
      ).join('');

      const newId = uuidv4();
      const cleanDomain = (domain || email.split('@')[1] || '').toLowerCase().trim();
      const cleanName = (contactName || name).trim();

      company = createCompany(
        newId,
        name.trim(),
        cleanDomain,
        email.toLowerCase().trim(),
        'Virksomhed',
        [],
        'DK',
        password
      );
      created = true;

      // Activate trial before sending email so trialEndsAt is correct.
      activateAISignalPremiumTrial(company.id);
      const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      // Fire-and-forget welcome email with credentials.
      sendTrialWelcomeEmail(email.toLowerCase().trim(), name.trim(), company.id, password, trialEndsAt)
        .catch((e) => console.error('Trial welcome email error:', e));

      return NextResponse.json({
        message: 'AISignal-konto oprettet og 3-måneders gratis premium trial aktiveret.',
        companyId: company.id,
        companyName: company.name,
        trialEndsAt,
        created: true,
      }, { status: 201 });
    }

    // Existing company — check if trial is already active.
    if (company.aisignal_plan === 'premium' && company.trial_ends_at) {
      const trialEnd = new Date(company.trial_ends_at);
      if (trialEnd > new Date()) {
        return NextResponse.json({
          message: 'Premium trial allerede aktiv.',
          companyId: company.id,
          trialEndsAt: company.trial_ends_at,
          created: false,
          alreadyActive: true,
        });
      }
    }

    activateAISignalPremiumTrial(company.id);
    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    // Send a welcome email even for re-activations (no password — they already have one).
    sendTrialWelcomeEmail(company.email, company.name, company.id, '(eksisterende adgangskode)', trialEndsAt)
      .catch((e) => console.error('Trial welcome email error:', e));

    return NextResponse.json({
      message: '3-måneders gratis premium trial aktiveret.',
      companyId: company.id,
      companyName: company.name,
      trialEndsAt,
      created: false,
    });
  } catch (err) {
    console.error('aiscore-activate error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
