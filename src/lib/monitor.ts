import { v4 as uuidv4 } from 'uuid';
import {
  Company,
  createMonitoringRun,
  updateRunStatus,
  saveMonitoringResult,
  createAlert,
  getResultsByRunId,
  getLastTwoRunIds,
  getRunCount,
} from './db';
import { sendWeeklyDigestEmail, sendFirstReportReadyEmail } from './email';
import { isPremium, FREE_TIER_SIGNAL_LIMIT } from './subscription';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'llama-3.1-sonar-small-128k-online';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Map category to a relevant use case for category_solution prompt
const CATEGORY_USE_CASES: Record<string, string> = {
  'Softwarevirksomhed': 'CRM/ERP implementering',
  'Konsulentvirksomhed': 'strategisk rådgivning og forandringsprocesser',
  'Marketing/Reklame': 'digital markedsføring og brandstrategi',
  'Advokatfirma': 'juridisk rådgivning og kontraktstyring',
  'Revisionsfirma': 'regnskab, revision og skatteoptimering',
  'Rekruttering/HR': 'talentrekruttering og HR-processer',
  'Ingeniør/Teknisk rådgivning': 'teknisk projektledelse og ingeniørrådgivning',
  'Byggeri/Ejendom': 'byggestyring og ejendomsudvikling',
  'Sundhed/Klinik': 'patientpleje og kliniske løsninger',
  'E-handel/Webshop': 'e-handelsplatform og konverteringsoptimering',
  'Restauration/Catering': 'cateringløsninger og restaurantdrift',
  'Produktion/Industri': 'produktionsoptimering og supply chain',
  'Transport/Logistik': 'logistikoptimering og transportledelse',
  'Finansielle ydelser': 'finansiel rådgivning og investeringsplanlægning',
  'Anden virksomhed': 'forretningsudvikling og vækststrategi',
};

interface PromptSpec {
  type: string;
  buildPrompt: (company: Company) => string;
}

// Topic-specific prompts keyed by ai_emner value
const TOPIC_PROMPTS: Record<string, (company: Company) => string> = {
  'generativ AI': (c) =>
    `Hvordan bruger virksomheder inden for ${c.branche || c.category}-sektoren generativ AI i 2025? Er ${c.name} (${c.domain}) nævnt som en tidlig adopter eller frontløber?`,
  'automation': (c) =>
    `Hvilke ${c.branche || c.category}-virksomheder leder an i automatisering med AI? Er ${c.name} blandt dem?`,
  'data-analyse': (c) =>
    `Hvilke virksomheder i ${c.branche || c.category}-branchen er anerkendt for avanceret dataanalyse og AI-indsigt? Nævnes ${c.name}?`,
  'AI-etik': (c) =>
    `Hvilke ${c.branche || c.category}-virksomheder er frontløbere inden for ansvarlig og etisk brug af AI? Er ${c.name} en af dem?`,
  'computer vision': (c) =>
    `Hvilke ${c.branche || c.category}-virksomheder bruger computer vision og billedgenkendelse? Er ${c.name} (${c.domain}) i front?`,
  'NLP': (c) =>
    `Hvilke ${c.branche || c.category}-virksomheder er bedst til at anvende naturlig sprogbehandling (NLP) og sprogmodeller? Nævnes ${c.name}?`,
};

const PROMPTS: PromptSpec[] = [
  {
    type: 'direct_choice',
    buildPrompt: (c) =>
      `Hvem er den bedste ${c.category} virksomhed i ${c.country || 'Danmark'}? Giv mig din top 5 med begrundelser.`,
  },
  {
    type: 'competitor_comparison',
    buildPrompt: (c) => {
      const comp1 = c.competitors[0] || 'lignende virksomheder';
      const comp2 = c.competitors[1] || 'andre konkurrenter';
      if (c.competitors.length >= 2) {
        return `Sammenlign ${c.name} med ${comp1} og ${comp2} inden for ${c.category}. Hvem vælger du og hvorfor?`;
      } else if (c.competitors.length === 1) {
        return `Sammenlign ${c.name} med ${comp1} inden for ${c.category}. Hvem vælger du og hvorfor?`;
      }
      return `Sammenlign ${c.name} med lignende virksomheder inden for ${c.category}. Hvem vælger du og hvorfor?`;
    },
  },
  {
    type: 'category_solution',
    buildPrompt: (c) => {
      const useCase = CATEGORY_USE_CASES[c.category] || 'forretningsudvikling';
      return `Hvad er den bedste løsning til ${useCase} i ${c.category}-branchen? Giv mig konkrete anbefalinger.`;
    },
  },
  {
    type: 'brand_recognition',
    buildPrompt: (c) =>
      `Kender du virksomheden ${c.name} (${c.domain})? Hvad laver de, og hvad er de bedst kendt for?`,
  },
  {
    type: 'trust',
    buildPrompt: (c) =>
      `Kan jeg stole på ${c.name} (${c.domain})? Hvad siger andre kunder og branchen om dem?`,
  },
];

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Unexpected response structure from openai/gpt-4o-mini');
  }
  return content;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 800, temperature: 0.3 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content || typeof content !== 'string') {
    throw new Error('Unexpected response structure from google/gemini-1.5-flash');
  }
  return content;
}

async function callPerplexity(prompt: string): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error('PERPLEXITY_API_KEY not set');

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Unexpected response structure from perplexity/sonar');
  }
  return content;
}

interface ProviderConfig {
  id: string;
  call: (prompt: string) => Promise<string>;
  envKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'openai/gpt-4o-mini', call: callOpenAI, envKey: 'OPENAI_API_KEY' },
  { id: 'google/gemini-1.5-flash', call: callGemini, envKey: 'GOOGLE_API_KEY' },
  { id: 'perplexity/sonar', call: callPerplexity, envKey: 'PERPLEXITY_API_KEY' },
];

function detectMentioned(response: string, company: Company): boolean {
  const lower = response.toLowerCase();
  return (
    lower.includes(company.name.toLowerCase()) ||
    lower.includes(company.domain.toLowerCase().replace(/\.(dk|com|io|net)$/, ''))
  );
}

function detectChosen(response: string, company: Company): boolean {
  const lower = response.toLowerCase();
  const name = company.name.toLowerCase();
  // Check for top-position signals
  const topSignals = [
    `1. ${name}`, `1) ${name}`, `#1 ${name}`,
    `bedste.*${name}`, `${name}.*bedste`,
    `anbefaler ${name}`, `valgt ${name}`, `${name} er den`,
    `vælger ${name}`, `foretrækker ${name}`,
  ];
  return topSignals.some((s) => {
    try {
      return new RegExp(s, 'i').test(lower);
    } catch {
      return lower.includes(s);
    }
  });
}

const NEGATIVE_WORDS = ['kritik', 'dårlig', 'problemer', 'utilfreds', 'klager', 'skandale', 'tvivl'];
const POSITIVE_WORDS = ['troværdig', 'anbefalet', 'fremragende', 'professionel', 'anerkendt'];

function calcSentiment(response: string, company: Company): number {
  const lower = response.toLowerCase();
  const nameIdx = lower.indexOf(company.name.toLowerCase());
  // Use a window around company name if found, otherwise full text
  const context = nameIdx !== -1
    ? lower.slice(Math.max(0, nameIdx - 200), nameIdx + 200)
    : lower;

  let pos = 0;
  let neg = 0;
  POSITIVE_WORDS.forEach((w) => { if (context.includes(w)) pos++; });
  NEGATIVE_WORDS.forEach((w) => { if (context.includes(w)) neg++; });

  const total = pos + neg;
  if (total === 0) return 0;
  return Math.round(((pos - neg) / total) * 100) / 100; // -1 to +1
}

function calcScore(mentioned: boolean, chosen: boolean, response: string, company: Company): number {
  let score = 0;
  if (mentioned) score += 40;
  if (chosen) score += 40;

  // Bonus for positive adjectives near company name
  const positives = ['stærk', 'anerkendt', 'troværdig', 'professionel', 'anbefalet', 'bedst', 'fremragende', 'top'];
  const lower = response.toLowerCase();
  const nameIdx = lower.indexOf(company.name.toLowerCase());
  if (nameIdx !== -1) {
    const context = lower.slice(Math.max(0, nameIdx - 100), nameIdx + 100);
    positives.forEach((p) => { if (context.includes(p)) score += 5; });
  }

  return Math.min(100, score);
}

export async function runMonitoringForCompany(company: Company): Promise<string> {
  const runId = uuidv4();
  await createMonitoringRun(runId, company.id);

  const activeProviders = PROVIDERS.filter((p) => !!process.env[p.envKey]);

  if (activeProviders.length === 0) {
    await updateRunStatus(runId, 'failed');
    throw new Error('No AI provider API keys configured (OPENAI_API_KEY, PERPLEXITY_API_KEY)');
  }

  const premium = isPremium(company);
  const signalLimit = premium ? Infinity : FREE_TIER_SIGNAL_LIMIT;

  // Build effective prompt list: base prompts + topic-specific prompts from preferences
  const effectivePrompts: PromptSpec[] = [...PROMPTS];
  if (company.ai_emner && company.ai_emner.length > 0) {
    for (const emne of company.ai_emner) {
      const builder = TOPIC_PROMPTS[emne];
      if (builder) {
        effectivePrompts.push({ type: `topic_${emne.replace(/\s+/g, '_')}`, buildPrompt: builder });
      }
    }
  }

  try {
    let signalCount = 0;
    outer: for (const provider of activeProviders) {
      for (const spec of effectivePrompts) {
        if (signalCount >= signalLimit) break outer;

        const prompt = spec.buildPrompt(company);
        let response: string;

        try {
          response = await provider.call(prompt);
        } catch (err) {
          console.error(`${provider.id} error for prompt type ${spec.type}:`, err);
          continue;
        }

        const mentioned = detectMentioned(response, company);
        const chosen = detectChosen(response, company);
        const score = calcScore(mentioned, chosen, response, company);
        const sentiment = calcSentiment(response, company);

        await saveMonitoringResult({
          id: uuidv4(),
          run_id: runId,
          company_id: company.id,
          ai_system: provider.id,
          prompt_type: spec.type,
          prompt,
          response,
          mentioned: mentioned ? 1 : 0,
          chosen: chosen ? 1 : 0,
          score,
          sentiment,
        });

        signalCount++;
      }
    }

    await updateRunStatus(runId, 'done');

    const completedRuns = await getRunCount(company.id);
    if (completedRuns === 1) {
      sendFirstReportReadyEmail(company.email, company.name, company.id).catch((e) =>
        console.error('First report email error:', e)
      );
    }

    await checkAndCreateAlerts(company, runId);
  } catch (err) {
    await updateRunStatus(runId, 'failed');
    throw err;
  }

  return runId;
}

function formatAiSystems(results: { ai_system: string }[]): string {
  const names = [...new Set(results.map(r => r.ai_system))].map(s => {
    if (s.includes('openai')) return 'ChatGPT';
    if (s.includes('google')) return 'Gemini';
    if (s.includes('perplexity')) return 'Perplexity';
    return s;
  });
  return names.join(' · ');
}

async function checkAndCreateAlerts(company: Company, currentRunId: string) {
  const runIds = await getLastTwoRunIds(company.id);
  if (runIds.length < 2) return; // Need at least 2 completed runs

  const [latestRunId, previousRunId] = runIds;
  // currentRunId should be the latest; skip if mismatch
  if (latestRunId !== currentRunId) return;

  const currentResults = await getResultsByRunId(currentRunId);
  const previousResults = await getResultsByRunId(previousRunId);

  if (currentResults.length === 0 || previousResults.length === 0) return;

  const allAiSystems = formatAiSystems(currentResults);

  type SignalLevel = 'Critical' | 'High' | 'Medium' | 'Low';
  const digestSignals: { headline: string; consequence: string; level: SignalLevel; sourceAI: string }[] = [];

  // 1. valgt_fald: Valgt-score falls >10 pp
  const currentChosenRate = (currentResults.filter(r => r.chosen).length / currentResults.length) * 100;
  const previousChosenRate = (previousResults.filter(r => r.chosen).length / previousResults.length) * 100;
  const chosenDiff = currentChosenRate - previousChosenRate;

  if (chosenDiff <= -10) {
    const msg = `Valgt-score faldet med ${Math.abs(chosenDiff).toFixed(0)} procentpoint (${previousChosenRate.toFixed(0)}% → ${currentChosenRate.toFixed(0)}%)`;
    await createAlert(uuidv4(), company.id, 'valgt_fald', msg);
    digestSignals.push({
      headline: msg,
      consequence: `Færre kunder vælger jer via AI. Det kan reducere antallet af uopfordrede henvendelser og forringer jeres synlighed i AI-drevne anbefalinger.`,
      level: chosenDiff <= -20 ? 'High' : 'Medium',
      sourceAI: allAiSystems,
    });
  }

  // 2. konkurrent_overtag: A competitor mention rate exceeds company mention rate
  if (company.competitors.length > 0) {
    const companyMentionRate = (currentResults.filter(r => r.mentioned).length / currentResults.length) * 100;
    for (const competitor of company.competitors) {
      let competitorMentions = 0;
      for (const r of currentResults) {
        if (r.response.toLowerCase().includes(competitor.toLowerCase())) {
          competitorMentions++;
        }
      }
      const competitorRate = (competitorMentions / currentResults.length) * 100;
      if (competitorRate > companyMentionRate) {
        const msg = `${competitor} nævnes nu oftere end ${company.name} i AI-svar (${competitorRate.toFixed(0)}% vs ${companyMentionRate.toFixed(0)}%)`;
        await createAlert(uuidv4(), company.id, 'konkurrent_overtag', msg);
        digestSignals.push({
          headline: msg,
          consequence: `En konkurrent dominerer nu AI-anbefalingerne i jeres kategori. Det betyder at AI aktivt sender kunder til dem frem for jer.`,
          level: 'High',
          sourceAI: allAiSystems,
        });
        break; // One alert per run is enough
      }
    }
  }

  // 3. nævnt_fald: Nævnt-score falls >15 pp
  const currentMentionRate = (currentResults.filter(r => r.mentioned).length / currentResults.length) * 100;
  const previousMentionRate = (previousResults.filter(r => r.mentioned).length / previousResults.length) * 100;
  const mentionDiff = currentMentionRate - previousMentionRate;

  if (mentionDiff <= -15) {
    const msg = `Nævnt-score faldet med ${Math.abs(mentionDiff).toFixed(0)} procentpoint (${previousMentionRate.toFixed(0)}% → ${currentMentionRate.toFixed(0)}%)`;
    await createAlert(uuidv4(), company.id, 'nævnt_fald', msg);
    digestSignals.push({
      headline: msg,
      consequence: `AI-systemer nævner jer sjældnere i relevante kategorier. Det øger risikoen for at potentielle kunder ikke opdager jer, når de søger løsninger via AI.`,
      level: mentionDiff <= -25 ? 'High' : 'Medium',
      sourceAI: allAiSystems,
    });
  }

  // 4. sentiment_aendring: Avg sentiment drops from positive (>0.3) to neutral/negative (<0.1)
  const currentAvgSentiment = currentResults.reduce((s, r) => s + r.sentiment, 0) / currentResults.length;
  const previousAvgSentiment = previousResults.reduce((s, r) => s + r.sentiment, 0) / previousResults.length;

  if (previousAvgSentiment > 0.3 && currentAvgSentiment < 0.1) {
    const msg = `Sentiment faldet fra positivt (${previousAvgSentiment.toFixed(2)}) til neutralt/negativt (${currentAvgSentiment.toFixed(2)})`;
    await createAlert(uuidv4(), company.id, 'sentiment_aendring', msg);
    digestSignals.push({
      headline: msg,
      consequence: `Tonen i AI-svar om jer er blevet mere negativ eller neutral. Det kan reducere konverteringsraten for kunder der undersøger jer via AI.`,
      level: 'Medium',
      sourceAI: allAiSystems,
    });
  }

  // 5. position_aendring: Company falls out of top-3 "chosen" responses
  const currentDirectChoice = currentResults.filter(r => r.prompt_type === 'direct_choice');
  const previousDirectChoice = previousResults.filter(r => r.prompt_type === 'direct_choice');

  if (currentDirectChoice.length > 0 && previousDirectChoice.length > 0) {
    const wasInTop3 = previousDirectChoice.some(r => detectTop3(r.response, company));
    const isInTop3 = currentDirectChoice.some(r => detectTop3(r.response, company));

    if (wasInTop3 && !isInTop3) {
      const msg = `${company.name} er faldet ud af top-3 i direkte AI-valg`;
      await createAlert(uuidv4(), company.id, 'position_aendring', msg);
      const directAiSystems = formatAiSystems(currentDirectChoice);
      digestSignals.push({
        headline: msg,
        consequence: `I er ikke længere i top-3 når AI anbefaler virksomheder i jeres kategori direkte. Det betyder at AI aktivt fraråder jer til nye kunder.`,
        level: 'Critical',
        sourceAI: directAiSystems || allAiSystems,
      });
    }
  }

  // Send one consolidated digest email if there are any signals
  if (digestSignals.length > 0) {
    await sendWeeklyDigestEmail(company.email, company.name, company.id, digestSignals);
  }
}

function detectTop3(response: string, company: Company): boolean {
  const lower = response.toLowerCase();
  const name = company.name.toLowerCase();
  // Check if company appears in positions 1, 2, or 3
  const top3Signals = [
    `1. ${name}`, `1) ${name}`, `#1 ${name}`,
    `2. ${name}`, `2) ${name}`, `#2 ${name}`,
    `3. ${name}`, `3) ${name}`, `#3 ${name}`,
  ];
  return top3Signals.some(s => lower.includes(s));
}

