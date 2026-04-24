import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getCompanyResults, getCompanyAlerts, getRunCount } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const company = getCompany(id);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
    }

    const results = getCompanyResults(id, 200);
    const alerts = getCompanyAlerts(id);
    const runCount = getRunCount(id);

    // Aggregate stats
    const totalResults = results.length;
    const mentionRate = totalResults > 0
      ? Math.round((results.filter(r => r.mentioned).length / totalResults) * 100)
      : 0;
    const chosenRate = totalResults > 0
      ? Math.round((results.filter(r => r.chosen).length / totalResults) * 100)
      : 0;
    const avgScore = totalResults > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / totalResults)
      : 0;
    const avgSentiment = totalResults > 0
      ? Math.round((results.reduce((s, r) => s + (r.sentiment ?? 0), 0) / totalResults) * 100) / 100
      : 0;

    // Score trend: last 14 days grouped by day
    const trend = buildTrend(results);

    // Per AI-system breakdown
    const bySystem = buildBySystem(results);

    // Prompt type breakdown
    const byType = buildByType(results);

    const trialActive = company.aisignal_plan === 'premium' && !!company.trial_ends_at && new Date(company.trial_ends_at) > new Date();
    const trialDaysLeft = trialActive && company.trial_ends_at
      ? Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        domain: company.domain,
        category: company.category,
        plan: company.aisignal_plan,
        productsPurchased: company.products_purchased,
        trialEndsAt: company.trial_ends_at,
        trialActive,
        trialDaysLeft,
      },
      stats: { mentionRate, chosenRate, avgScore, avgSentiment, runCount, totalResults },
      trend,
      bySystem,
      byType,
      alerts,
      recentResults: results.slice(0, 20),
    });
  } catch (err) {
    console.error('Results error:', err);
    return NextResponse.json({ error: 'Fejl ved hentning af resultater.' }, { status: 500 });
  }
}

function buildTrend(results: { created_at: string; score: number; mentioned: number; chosen: number; sentiment?: number }[]) {
  const map: Record<string, { scores: number[]; mentioned: number; chosen: number; total: number; sentiments: number[] }> = {};
  results.forEach(r => {
    const day = r.created_at.split('T')[0] || r.created_at.split(' ')[0];
    if (!map[day]) map[day] = { scores: [], mentioned: 0, chosen: 0, total: 0, sentiments: [] };
    map[day].scores.push(r.score);
    map[day].sentiments.push(r.sentiment ?? 0);
    if (r.mentioned) map[day].mentioned++;
    if (r.chosen) map[day].chosen++;
    map[day].total++;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, d]) => ({
      date,
      avgScore: Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length),
      mentionRate: Math.round((d.mentioned / d.total) * 100),
      chosenRate: Math.round((d.chosen / d.total) * 100),
      avgSentiment: Math.round((d.sentiments.reduce((s, v) => s + v, 0) / d.sentiments.length) * 100) / 100,
    }));
}

function buildBySystem(results: { ai_system: string; mentioned: number; chosen: number; score: number }[]) {
  const map: Record<string, { scores: number[]; mentioned: number; total: number }> = {};
  results.forEach(r => {
    if (!map[r.ai_system]) map[r.ai_system] = { scores: [], mentioned: 0, total: 0 };
    map[r.ai_system].scores.push(r.score);
    if (r.mentioned) map[r.ai_system].mentioned++;
    map[r.ai_system].total++;
  });
  return Object.entries(map).map(([system, d]) => ({
    system,
    avgScore: Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length),
    mentionRate: Math.round((d.mentioned / d.total) * 100),
  }));
}

function buildByType(results: { prompt_type: string; mentioned: number; chosen: number; score: number }[]) {
  const map: Record<string, { scores: number[]; mentioned: number; chosen: number; total: number }> = {};
  results.forEach(r => {
    if (!map[r.prompt_type]) map[r.prompt_type] = { scores: [], mentioned: 0, chosen: 0, total: 0 };
    map[r.prompt_type].scores.push(r.score);
    if (r.mentioned) map[r.prompt_type].mentioned++;
    if (r.chosen) map[r.prompt_type].chosen++;
    map[r.prompt_type].total++;
  });
  return Object.entries(map).map(([type, d]) => ({
    type,
    avgScore: Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length),
    mentionRate: Math.round((d.mentioned / d.total) * 100),
    chosenRate: Math.round((d.chosen / d.total) * 100),
  }));
}
