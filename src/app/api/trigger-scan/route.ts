import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getCompanyByEmail, getAllActiveCompanies } from '@/lib/db';
import { runMonitoringForCompany } from '@/lib/monitor';
import { requireAdminAuth } from '@/lib/admin-auth';

// Admin-only endpoint for manually triggering a monitoring scan.
// Requires Authorization: Bearer <ADMIN_SECRET> (or x-admin-secret header).
// CRON_SECRET is intentionally NOT accepted here — cron and admin credentials must stay separate.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authError = requireAdminAuth(req);
  if (authError) return authError;

  let body: { companyId?: string; email?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { companyId, email, all } = body;

  // Scan all active companies
  if (all) {
    const companies = await getAllActiveCompanies();
    const results: { companyId: string; name: string; runId?: string; error?: string }[] = [];
    for (const company of companies) {
      try {
        const runId = await runMonitoringForCompany(company);
        results.push({ companyId: company.id, name: company.name, runId });
      } catch (err) {
        results.push({ companyId: company.id, name: company.name, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return NextResponse.json({ ran: results.filter(r => r.runId).length, failed: results.filter(r => r.error).length, results });
  }

  // Scan single company by id or email
  let company = null;
  if (companyId) {
    company = await getCompany(companyId);
    if (!company) return NextResponse.json({ error: `Virksomhed ikke fundet: ${companyId}` }, { status: 404 });
  } else if (email) {
    company = await getCompanyByEmail(email);
    if (!company) return NextResponse.json({ error: `Ingen virksomhed med email: ${email}` }, { status: 404 });
  } else {
    return NextResponse.json({ error: 'Angiv companyId, email, eller all: true' }, { status: 400 });
  }

  try {
    const runId = await runMonitoringForCompany(company);
    return NextResponse.json({ runId, companyId: company.id, name: company.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('trigger-scan error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
