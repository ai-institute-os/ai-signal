import { v4 as uuidv4 } from 'uuid';
import {
  Company,
  createMonitoringRun,
  updateRunStatus,
  saveMonitoringResult,
  createAlert,
  getResultsByRunId,
  getLastTwoRunIds,
} from './db';
import { sendAlertEmail } from './email';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const PERPLEXITY_MODEL = 'llama-3.1-sonar-small-128k-online';

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
  return data.choices[0].message.content as string;
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
  return data.choices[0].message.content as string;
}

interface ProviderConfig {
  id: string;
  call: (prompt: string) => Promise<string>;
  envKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  { id: 'openai/gpt-4o-mini', call: callOpenAI, envKey: 'OPENAI_API_KEY' },
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
  createMonitoringRun(runId, company.id);

  const activeProviders = PROVIDERS.filter((p) => !!process.env[p.envKey]);

  if (activeProviders.length === 0) {
    updateRunStatus(runId, 'failed');
    throw new Error('No AI provider API keys configured (OPENAI_API_KEY, PERPLEXITY_API_KEY)');
  }

  try {
    for (const provider of activeProviders) {
      for (const spec of PROMPTS) {
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

        saveMonitoringResult({
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
      }
    }

    updateRunStatus(runId, 'done');
    await checkAndCreateAlerts(company, runId);
  } catch (err) {
    updateRunStatus(runId, 'failed');
    throw err;
  }

  return runId;
}

async function checkAndCreateAlerts(company: Company, currentRunId: string) {
  const runIds = getLastTwoRunIds(company.id);
  if (runIds.length < 2) return; // Need at least 2 completed runs

  const [latestRunId, previousRunId] = runIds;
  // currentRunId should be the latest; skip if mismatch
  if (latestRunId !== currentRunId) return;

  const currentResults = getResultsByRunId(currentRunId);
  const previousResults = getResultsByRunId(previousRunId);

  if (currentResults.length === 0 || previousResults.length === 0) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';
  const dashboardUrl = `${baseUrl}/dashboard/${company.id}`;
  const today = new Date().toISOString().split('T')[0];

  const alertsToSend: { type: string; message: string; subject: string; body: string }[] = [];

  // 1. valgt_fald: Valgt-score falls >10 pp
  const currentChosenRate = (currentResults.filter(r => r.chosen).length / currentResults.length) * 100;
  const previousChosenRate = (previousResults.filter(r => r.chosen).length / previousResults.length) * 100;
  const chosenDiff = currentChosenRate - previousChosenRate;

  if (chosenDiff <= -10) {
    const msg = `Din Valgt-score er faldet med ${Math.abs(chosenDiff).toFixed(0)} procentpoint.`;
    const body = buildAlertBody('valgt_fald', company.name, msg, previousChosenRate, currentChosenRate, today, dashboardUrl);
    createAlert(uuidv4(), company.id, 'valgt_fald', msg);
    alertsToSend.push({ type: 'valgt_fald', message: msg, subject: `Valgt-score faldet — ${company.name}`, body });
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
        const msg = `${competitor} nævnes nu oftere end ${company.name} i AI-svar (${competitorRate.toFixed(0)}% vs ${companyMentionRate.toFixed(0)}%).`;
        const body = buildAlertBody('konkurrent_overtag', company.name, msg, companyMentionRate, competitorRate, today, dashboardUrl);
        createAlert(uuidv4(), company.id, 'konkurrent_overtag', msg);
        alertsToSend.push({ type: 'konkurrent_overtag', message: msg, subject: `Konkurrent overhaler — ${company.name}`, body });
        break; // One alert per run is enough
      }
    }
  }

  // 3. nævnt_fald: Nævnt-score falls >15 pp
  const currentMentionRate = (currentResults.filter(r => r.mentioned).length / currentResults.length) * 100;
  const previousMentionRate = (previousResults.filter(r => r.mentioned).length / previousResults.length) * 100;
  const mentionDiff = currentMentionRate - previousMentionRate;

  if (mentionDiff <= -15) {
    const msg = `Din Nævnt-score er faldet med ${Math.abs(mentionDiff).toFixed(0)} procentpoint.`;
    const body = buildAlertBody('nævnt_fald', company.name, msg, previousMentionRate, currentMentionRate, today, dashboardUrl);
    createAlert(uuidv4(), company.id, 'nævnt_fald', msg);
    alertsToSend.push({ type: 'nævnt_fald', message: msg, subject: `Nævnt-score faldet — ${company.name}`, body });
  }

  // 4. sentiment_aendring: Avg sentiment drops from positive (>0.3) to neutral/negative (<0.1)
  const currentAvgSentiment = currentResults.reduce((s, r) => s + r.sentiment, 0) / currentResults.length;
  const previousAvgSentiment = previousResults.reduce((s, r) => s + r.sentiment, 0) / previousResults.length;

  if (previousAvgSentiment > 0.3 && currentAvgSentiment < 0.1) {
    const msg = `Gennemsnitssentiment er faldet fra positivt (${previousAvgSentiment.toFixed(2)}) til neutralt/negativt (${currentAvgSentiment.toFixed(2)}).`;
    const body = buildAlertBody('sentiment_aendring', company.name, msg, previousAvgSentiment * 100, currentAvgSentiment * 100, today, dashboardUrl);
    createAlert(uuidv4(), company.id, 'sentiment_aendring', msg);
    alertsToSend.push({ type: 'sentiment_aendring', message: msg, subject: `Sentiment ændret — ${company.name}`, body });
  }

  // 6. position_aendring: Company falls out of top-3 "chosen" responses
  // Check direct_choice results specifically — were they in top 3 before but not now?
  const currentDirectChoice = currentResults.filter(r => r.prompt_type === 'direct_choice');
  const previousDirectChoice = previousResults.filter(r => r.prompt_type === 'direct_choice');

  if (currentDirectChoice.length > 0 && previousDirectChoice.length > 0) {
    const wasInTop3 = previousDirectChoice.some(r => detectTop3(r.response, company));
    const isInTop3 = currentDirectChoice.some(r => detectTop3(r.response, company));

    if (wasInTop3 && !isInTop3) {
      const msg = `${company.name} er faldet ud af top-3 i direkte AI-valg.`;
      const body = buildAlertBody('position_aendring', company.name, msg, 1, 0, today, dashboardUrl);
      createAlert(uuidv4(), company.id, 'position_aendring', msg);
      alertsToSend.push({ type: 'position_aendring', message: msg, subject: `Position ændret — ${company.name}`, body });
    }
  }

  // Send email for each new alert
  for (const alert of alertsToSend) {
    await sendAlertEmail(company.email, company.name, company.id, alert.type, alert.message, alert.subject, alert.body);
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

function buildAlertBody(
  alertType: string,
  companyName: string,
  whatHappened: string,
  before: number,
  after: number,
  detectedDate: string,
  dashboardUrl: string
): string {
  const change = after - before;
  const metric = getMetricName(alertType);
  return `EMNE: [${alertType}] — ${companyName}

HVA SKER:
${whatHappened}

TALLENE:
Før: ${metric} = ${before.toFixed(0)}%
Nu: ${metric} = ${after.toFixed(0)}%
Ændring: ${change >= 0 ? '+' : ''}${change.toFixed(0)} procentpoint

HVORNÅR:
Detekteret: ${detectedDate}

SE I DASHBOARD:
${dashboardUrl}

---
Dette er en observation. AISignal træffer ingen beslutninger for dig.`;
}

function getMetricName(alertType: string): string {
  switch (alertType) {
    case 'valgt_fald': return 'Valgt-score';
    case 'nævnt_fald': return 'Nævnt-score';
    case 'konkurrent_overtag': return 'Nævnt-rate';
    case 'sentiment_aendring': return 'Sentiment';
    case 'position_aendring': return 'Top-3 position';
    default: return 'Score';
  }
}
