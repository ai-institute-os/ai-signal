import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getCompanyByEmail, activateAISignalPremiumTrial } from '@/lib/db';

// Called after AIScore review call to grant 3-month free premium trial on AISignal.
// Requires ADMIN_SECRET header to prevent unauthorized access.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { companyId, email } = await req.json();

    let company = null;
    if (companyId) {
      company = getCompany(companyId);
    } else if (email) {
      company = getCompanyByEmail(email);
    }

    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
    }

    if (company.aisignal_plan === 'premium' && company.trial_ends_at) {
      const trialEnd = new Date(company.trial_ends_at);
      if (trialEnd > new Date()) {
        return NextResponse.json({
          message: 'Premium trial allerede aktiv.',
          companyId: company.id,
          trialEndsAt: company.trial_ends_at,
          alreadyActive: true,
        });
      }
    }

    activateAISignalPremiumTrial(company.id);

    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      message: '3-måneders gratis premium trial aktiveret.',
      companyId: company.id,
      companyName: company.name,
      trialEndsAt,
    });
  } catch (err) {
    console.error('aiscore-activate error:', err);
    return NextResponse.json({ error: 'Intern fejl.' }, { status: 500 });
  }
}
