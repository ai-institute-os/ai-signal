import { NextRequest, NextResponse } from 'next/server';
import { getCompany, getCompanyResults } from '@/lib/db';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

// GET /api/monitoring/history?companyId=...&promptType=...&aiSystem=...&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId er påkrævet.' }, { status: 400 });
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session || session.companyId !== companyId) {
      return NextResponse.json({ error: 'Ikke autoriseret.' }, { status: 401 });
    }

    const company = await getCompany(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Virksomhed ikke fundet.' }, { status: 404 });
    }

    const rawLimit = Number(searchParams.get('limit') ?? '200');
    const limit = isNaN(rawLimit) ? 200 : Math.min(Math.max(1, rawLimit), 500);
    const filterPromptType = searchParams.get('promptType');
    const filterAiSystem = searchParams.get('aiSystem');

    let results = await getCompanyResults(companyId, limit);

    if (filterPromptType) {
      results = results.filter((r) => r.prompt_type === filterPromptType);
    }
    if (filterAiSystem) {
      results = results.filter((r) => r.ai_system === filterAiSystem);
    }

    // Group by prompt_type × ai_system for summary view
    const grouped: Record<
      string,
      { promptType: string; aiSystem: string; total: number; mentionRate: number; chosenRate: number; avgScore: number; avgSentiment: number }
    > = {};

    for (const r of results) {
      const key = `${r.prompt_type}|${r.ai_system}`;
      if (!grouped[key]) {
        grouped[key] = {
          promptType: r.prompt_type,
          aiSystem: r.ai_system,
          total: 0,
          mentionRate: 0,
          chosenRate: 0,
          avgScore: 0,
          avgSentiment: 0,
        };
      }
      grouped[key].total++;
      if (r.mentioned) grouped[key].mentionRate++;
      if (r.chosen) grouped[key].chosenRate++;
      grouped[key].avgScore += r.score;
      grouped[key].avgSentiment += r.sentiment ?? 0;
    }

    const summary = Object.values(grouped).map((g) => ({
      promptType: g.promptType,
      aiSystem: g.aiSystem,
      total: g.total,
      mentionRate: Math.round((g.mentionRate / g.total) * 100),
      chosenRate: Math.round((g.chosenRate / g.total) * 100),
      avgScore: Math.round(g.avgScore / g.total),
      avgSentiment: Math.round((g.avgSentiment / g.total) * 100) / 100,
    }));

    return NextResponse.json({
      companyId,
      total: results.length,
      summary,
      results: results.slice(0, 100).map((r) => ({
        id: r.id,
        promptType: r.prompt_type,
        aiSystem: r.ai_system,
        prompt: r.prompt,
        response: r.response,
        mentioned: !!r.mentioned,
        chosen: !!r.chosen,
        score: r.score,
        sentiment: r.sentiment,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Monitoring history error:', err);
    return NextResponse.json({ error: 'Fejl ved hentning af historik.' }, { status: 500 });
  }
}
