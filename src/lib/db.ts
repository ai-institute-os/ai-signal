import { createClient, type Client } from '@libsql/client';

let _db: Client | null = null;
let _initPromise: Promise<void> | null = null;

function getClient(): Client {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    _db = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _db;
}

async function ensureInit(): Promise<Client> {
  const db = getClient();
  if (!_initPromise) {
    _initPromise = initSchema(db);
  }
  await _initPromise;
  return db;
}

async function initSchema(db: Client): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      email TEXT NOT NULL,
      category TEXT NOT NULL,
      competitors TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active',
      country TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      products_purchased TEXT NOT NULL DEFAULT '[]',
      aisignal_plan TEXT NOT NULL DEFAULT 'free',
      trial_ends_at TEXT,
      upsell_count INTEGER NOT NULL DEFAULT 0,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      stripe_subscription_status TEXT,
      stripe_price_id TEXT,
      upsell_email_sent INTEGER NOT NULL DEFAULT 0,
      trial_warning_10_sent INTEGER NOT NULL DEFAULT 0,
      trial_warning_2_sent INTEGER NOT NULL DEFAULT 0,
      alert_frequency TEXT NOT NULL DEFAULT 'weekly',
      subscriber_status TEXT NOT NULL DEFAULT 'active',
      paused_until TEXT,
      verification_token TEXT,
      email_verified INTEGER NOT NULL DEFAULT 1,
      branche TEXT NOT NULL DEFAULT '',
      ai_emner TEXT NOT NULL DEFAULT '[]',
      preferences_json TEXT,
      unsubscribed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS monitoring_runs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS monitoring_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      ai_system TEXT NOT NULL,
      prompt_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      mentioned INTEGER NOT NULL DEFAULT 0,
      chosen INTEGER NOT NULL DEFAULT 0,
      score REAL NOT NULL DEFAULT 0,
      sentiment REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (run_id) REFERENCES monitoring_runs(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      seen INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      author TEXT NOT NULL DEFAULT 'AISignal',
      status TEXT NOT NULL DEFAULT 'published',
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS article_reads (
      company_id TEXT NOT NULL,
      article_id TEXT NOT NULL,
      read_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (company_id, article_id)
    );

    CREATE INDEX IF NOT EXISTS idx_results_company ON monitoring_results(company_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id, seen);
    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
    CREATE INDEX IF NOT EXISTS idx_article_reads_company ON article_reads(company_id);

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      confirmation_token TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id TEXT PRIMARY KEY,
      subscriber_id TEXT NOT NULL,
      email_type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'sent'
    );

    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id TEXT PRIMARY KEY,
      subscriber_id TEXT NOT NULL,
      email_type TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      sent_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
    CREATE INDEX IF NOT EXISTS idx_newsletter_token ON newsletter_subscribers(confirmation_token);
    CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_email_log_subscriber ON email_log(subscriber_id);
  `);

  // Migrations for existing databases
  const migrations = [
    `ALTER TABLE companies ADD COLUMN alert_frequency TEXT NOT NULL DEFAULT 'weekly'`,
    `ALTER TABLE companies ADD COLUMN subscriber_status TEXT NOT NULL DEFAULT 'active'`,
    `ALTER TABLE companies ADD COLUMN paused_until TEXT`,
    `ALTER TABLE companies ADD COLUMN verification_token TEXT`,
    `ALTER TABLE companies ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE companies ADD COLUMN management_token TEXT`,
    `ALTER TABLE companies ADD COLUMN branche TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE companies ADD COLUMN ai_emner TEXT NOT NULL DEFAULT '[]'`,
    `ALTER TABLE companies ADD COLUMN preferences_json TEXT`,
    `ALTER TABLE companies ADD COLUMN unsubscribed_at TEXT`,
  ];
  for (const sql of migrations) {
    try {
      await db.execute({ sql, args: [] });
    } catch {
      // Column already exists — ignore
    }
  }

  // Backfill management_token for existing rows that don't have one
  await db.execute({
    sql: `UPDATE companies SET management_token = lower(hex(randomblob(16))) WHERE management_token IS NULL`,
    args: [],
  });
}

// Row → typed object helpers
function parseCompanyRow(row: Record<string, unknown>): Company {
  return {
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    email: row.email as string,
    category: row.category as string,
    competitors: JSON.parse((row.competitors as string) || '[]'),
    country: (row.country as string) || '',
    password: (row.password as string) || '',
    created_at: row.created_at as string,
    status: (row.status as string) || 'active',
    products_purchased: JSON.parse((row.products_purchased as string) || '[]'),
    aisignal_plan: ((row.aisignal_plan as string) || 'free') as 'free' | 'premium',
    trial_ends_at: (row.trial_ends_at as string | null) ?? null,
    upsell_count: (row.upsell_count as number) || 0,
    stripe_customer_id: (row.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id: (row.stripe_subscription_id as string | null) ?? null,
    stripe_subscription_status: (row.stripe_subscription_status as string | null) ?? null,
    stripe_price_id: (row.stripe_price_id as string | null) ?? null,
    alert_frequency: ((row.alert_frequency as string) || 'weekly') as 'weekly' | 'monthly',
    subscriber_status: ((row.subscriber_status as string) || 'active') as 'active' | 'paused' | 'unsubscribed' | 'pending',
    paused_until: (row.paused_until as string | null) ?? null,
    verification_token: (row.verification_token as string | null) ?? null,
    email_verified: (row.email_verified as number) === 1,
    management_token: (row.management_token as string | null) ?? null,
    branche: (row.branche as string) || '',
    ai_emner: JSON.parse((row.ai_emner as string) || '[]'),
    preferences_json: row.preferences_json ? JSON.parse(row.preferences_json as string) as EmailPreferences : null,
    unsubscribed_at: (row.unsubscribed_at as string | null) ?? null,
  };
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  email: string;
  category: string;
  competitors: string[];
  country: string;
  password: string;
  created_at: string;
  status: string;
  products_purchased: string[];
  aisignal_plan: 'free' | 'premium';
  trial_ends_at: string | null;
  upsell_count: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  stripe_price_id: string | null;
  alert_frequency: 'weekly' | 'monthly';
  subscriber_status: 'active' | 'paused' | 'unsubscribed' | 'pending';
  paused_until: string | null;
  verification_token: string | null;
  email_verified: boolean;
  management_token: string | null;
  branche: string;
  ai_emner: string[];
  preferences_json: EmailPreferences | null;
  unsubscribed_at: string | null;
}

export interface MonitoringRun {
  id: string;
  company_id: string;
  created_at: string;
  status: string;
}

export interface MonitoringResult {
  id: string;
  run_id: string;
  company_id: string;
  ai_system: string;
  prompt_type: string;
  prompt: string;
  response: string;
  mentioned: number;
  chosen: number;
  score: number;
  sentiment: number;
  created_at: string;
}

export interface Alert {
  id: string;
  company_id: string;
  type: string;
  message: string;
  created_at: string;
  seen: number;
}

export async function createCompany(
  id: string,
  name: string,
  domain: string,
  email: string,
  category: string,
  competitors: string[],
  country: string,
  password: string,
  verificationToken?: string
): Promise<Company> {
  const db = await ensureInit();
  const managementToken = crypto.randomUUID();
  if (verificationToken) {
    await db.execute({
      sql: `INSERT INTO companies (id, name, domain, email, category, competitors, country, password, subscriber_status, email_verified, verification_token, management_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
      args: [id, name, domain, email, category, JSON.stringify(competitors), country, password, verificationToken, managementToken],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO companies (id, name, domain, email, category, competitors, country, password, management_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, domain, email, category, JSON.stringify(competitors), country, password, managementToken],
    });
  }
  return (await getCompany(id))!;
}

export async function getCompany(id: string): Promise<Company | null> {
  const db = await ensureInit();
  const result = await db.execute({ sql: 'SELECT * FROM companies WHERE id = ?', args: [id] });
  if (result.rows.length === 0) return null;
  return parseCompanyRow(result.rows[0] as Record<string, unknown>);
}

export async function getCompanyByEmail(email: string): Promise<Company | null> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT * FROM companies WHERE email = ?',
    args: [email.toLowerCase().trim()],
  });
  if (result.rows.length === 0) return null;
  return parseCompanyRow(result.rows[0] as Record<string, unknown>);
}

export async function activateAISignalPremiumTrial(companyId: string): Promise<void> {
  const db = await ensureInit();
  const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const company = await getCompany(companyId);
  if (!company) return;
  const purchased = company.products_purchased;
  if (!purchased.includes('aiscore')) purchased.push('aiscore');
  await db.execute({
    sql: `UPDATE companies SET aisignal_plan = 'premium', trial_ends_at = ?, products_purchased = ? WHERE id = ?`,
    args: [trialEndsAt, JSON.stringify(purchased), companyId],
  });
}

export async function getNextUpsellRecommendation(
  companyId: string
): Promise<{ recommendation: 'aiscore' | 'aiselect'; count: number }> {
  const db = await ensureInit();
  const company = await getCompany(companyId);
  if (!company) throw new Error('Company not found');

  const count = company.upsell_count;
  const hasPurchasedAIScore = company.products_purchased.includes('aiscore');

  let recommendation: 'aiscore' | 'aiselect';
  if (hasPurchasedAIScore) {
    recommendation = 'aiselect';
  } else {
    recommendation = (count % 10) < 5 ? 'aiscore' : 'aiselect';
  }

  await db.execute({
    sql: 'UPDATE companies SET upsell_count = upsell_count + 1 WHERE id = ?',
    args: [companyId],
  });
  return { recommendation, count: count + 1 };
}

export async function createMonitoringRun(id: string, companyId: string): Promise<MonitoringRun> {
  const db = await ensureInit();
  await db.execute({
    sql: 'INSERT INTO monitoring_runs (id, company_id) VALUES (?, ?)',
    args: [id, companyId],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM monitoring_runs WHERE id = ?',
    args: [id],
  });
  return result.rows[0] as unknown as MonitoringRun;
}

export async function updateRunStatus(id: string, status: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({ sql: 'UPDATE monitoring_runs SET status = ? WHERE id = ?', args: [status, id] });
}

export async function saveMonitoringResult(result: Omit<MonitoringResult, 'created_at'>): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `INSERT INTO monitoring_results (id, run_id, company_id, ai_system, prompt_type, prompt, response, mentioned, chosen, score, sentiment)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      result.id, result.run_id, result.company_id, result.ai_system,
      result.prompt_type, result.prompt, result.response,
      result.mentioned, result.chosen, result.score, result.sentiment,
    ],
  });
}

export async function getCompanyResults(companyId: string, limit = 100): Promise<MonitoringResult[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM monitoring_results WHERE company_id = ? ORDER BY created_at DESC LIMIT ?',
    args: [companyId, limit],
  });
  return r.rows as unknown as MonitoringResult[];
}

export async function getResultsByRunId(runId: string): Promise<MonitoringResult[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM monitoring_results WHERE run_id = ? ORDER BY created_at DESC',
    args: [runId],
  });
  return r.rows as unknown as MonitoringResult[];
}

export async function getLastTwoRunIds(companyId: string): Promise<string[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: `SELECT id FROM monitoring_runs WHERE company_id = ? AND status = 'done' ORDER BY created_at DESC LIMIT 2`,
    args: [companyId],
  });
  return r.rows.map(row => row.id as string);
}

export async function getCompanyAlerts(companyId: string): Promise<Alert[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM alerts WHERE company_id = ? ORDER BY created_at DESC LIMIT 20',
    args: [companyId],
  });
  return r.rows as unknown as Alert[];
}

export async function createAlert(id: string, companyId: string, type: string, message: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: 'INSERT INTO alerts (id, company_id, type, message) VALUES (?, ?, ?, ?)',
    args: [id, companyId, type, message],
  });
}

export async function markAlertSeen(alertId: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({ sql: 'UPDATE alerts SET seen = 1 WHERE id = ?', args: [alertId] });
}

export async function getLatestRunForCompany(companyId: string): Promise<MonitoringRun | null> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM monitoring_runs WHERE company_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [companyId],
  });
  if (r.rows.length === 0) return null;
  return r.rows[0] as unknown as MonitoringRun;
}

export async function getRunCount(companyId: string): Promise<number> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM monitoring_runs WHERE company_id = ? AND status = 'done'",
    args: [companyId],
  });
  return (r.rows[0]?.cnt as number) || 0;
}

export async function updateCompanyPassword(id: string, hashedPassword: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({ sql: 'UPDATE companies SET password = ? WHERE id = ?', args: [hashedPassword, id] });
}

export async function updateCompany(
  id: string,
  fields: Partial<Pick<Company, 'name' | 'domain' | 'email' | 'category' | 'country' | 'competitors'>>
): Promise<Company | null> {
  const db = await ensureInit();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (fields.name !== undefined) { sets.push('name = ?'); vals.push(fields.name); }
  if (fields.domain !== undefined) { sets.push('domain = ?'); vals.push(fields.domain); }
  if (fields.email !== undefined) { sets.push('email = ?'); vals.push(fields.email.toLowerCase().trim()); }
  if (fields.category !== undefined) { sets.push('category = ?'); vals.push(fields.category); }
  if (fields.country !== undefined) { sets.push('country = ?'); vals.push(fields.country); }
  if (fields.competitors !== undefined) { sets.push('competitors = ?'); vals.push(JSON.stringify(fields.competitors)); }
  if (sets.length === 0) return getCompany(id);
  vals.push(id);
  await db.execute({ sql: `UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, args: vals as never[] });
  return getCompany(id);
}

export async function getExpiredTrialCompanies(): Promise<Company[]> {
  const db = await ensureInit();
  const now = new Date().toISOString();
  const r = await db.execute({
    sql: `SELECT * FROM companies WHERE aisignal_plan = 'premium' AND trial_ends_at IS NOT NULL AND trial_ends_at <= ?`,
    args: [now],
  });
  return r.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
}

export async function expireTrialForCompany(companyId: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE companies SET aisignal_plan = 'free', trial_ends_at = NULL WHERE id = ?`,
    args: [companyId],
  });
}

export async function getAllActiveCompanies(): Promise<Company[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: "SELECT * FROM companies WHERE status = 'active' AND email_verified = 1 ORDER BY created_at ASC",
    args: [],
  });
  return r.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
}

export async function updateStripeCustomer(companyId: string, stripeCustomerId: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: 'UPDATE companies SET stripe_customer_id = ? WHERE id = ?',
    args: [stripeCustomerId, companyId],
  });
}

export async function updateStripeSubscription(
  companyId: string,
  subscriptionId: string,
  status: string,
  priceId: string,
  plan: 'free' | 'premium'
): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE companies SET stripe_subscription_id = ?, stripe_subscription_status = ?, stripe_price_id = ?, aisignal_plan = ?, trial_ends_at = NULL WHERE id = ?`,
    args: [subscriptionId, status, priceId, plan, companyId],
  });
}

export async function cancelStripeSubscription(companyId: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE companies SET aisignal_plan = 'free', stripe_subscription_id = NULL, stripe_subscription_status = 'canceled', stripe_price_id = NULL WHERE id = ?`,
    args: [companyId],
  });
}

export async function getCompanyByStripeCustomerId(stripeCustomerId: string): Promise<Company | null> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM companies WHERE stripe_customer_id = ?',
    args: [stripeCustomerId],
  });
  if (r.rows.length === 0) return null;
  return parseCompanyRow(r.rows[0] as Record<string, unknown>);
}

export async function getCompaniesReadyForStripeActivation(): Promise<Company[]> {
  const db = await ensureInit();
  const now = new Date().toISOString();
  const r = await db.execute({
    sql: `SELECT * FROM companies WHERE aisignal_plan = 'premium' AND trial_ends_at IS NOT NULL AND trial_ends_at <= ? AND (stripe_subscription_id IS NULL OR stripe_subscription_status = 'trialing')`,
    args: [now],
  });
  return r.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
}

export async function getFreeCompaniesForUpsellEmail(): Promise<Company[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: `SELECT c.* FROM companies c WHERE c.aisignal_plan = 'free' AND c.upsell_email_sent = 0 AND (SELECT COUNT(*) FROM monitoring_runs r WHERE r.company_id = c.id AND r.status = 'done') >= 3`,
    args: [],
  });
  return r.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
}

export async function markUpsellEmailSent(companyId: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({ sql: 'UPDATE companies SET upsell_email_sent = 1 WHERE id = ?', args: [companyId] });
}

export async function getCompaniesWithTrialEndingInDays(targetDays: number): Promise<Company[]> {
  const db = await ensureInit();
  const windowStart = new Date(Date.now() + targetDays * 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + (targetDays + 1) * 24 * 60 * 60 * 1000).toISOString();
  const sentColumn = targetDays <= 5 ? 'trial_warning_2_sent' : 'trial_warning_10_sent';
  const r = await db.execute({
    sql: `SELECT * FROM companies WHERE aisignal_plan = 'premium' AND trial_ends_at IS NOT NULL AND trial_ends_at >= ? AND trial_ends_at < ? AND ${sentColumn} = 0`,
    args: [windowStart, windowEnd],
  });
  return r.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
}

export async function markTrialWarningSent(companyId: string, daysLeft: number): Promise<void> {
  const db = await ensureInit();
  const col = daysLeft <= 5 ? 'trial_warning_2_sent' : 'trial_warning_10_sent';
  await db.execute({ sql: `UPDATE companies SET ${col} = 1 WHERE id = ?`, args: [companyId] });
}

export async function getCompaniesNeedingRun(olderThanHours: number): Promise<Company[]> {
  const db = await ensureInit();
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  // Monthly cutoff: ~28 days to be safe
  const monthlyCutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const r = await db.execute({
    sql: `SELECT c.* FROM companies c
          WHERE c.status = 'active'
            AND (c.subscriber_status IS NULL OR c.subscriber_status = 'active'
                 OR (c.subscriber_status = 'paused' AND c.paused_until IS NOT NULL AND c.paused_until <= ?))
            AND (
              (COALESCE(c.alert_frequency, 'weekly') = 'weekly'
               AND NOT EXISTS (SELECT 1 FROM monitoring_runs r WHERE r.company_id = c.id AND r.status = 'done' AND r.created_at > ?))
              OR
              (c.alert_frequency = 'monthly'
               AND NOT EXISTS (SELECT 1 FROM monitoring_runs r WHERE r.company_id = c.id AND r.status = 'done' AND r.created_at > ?))
            )
          ORDER BY c.created_at ASC`,
    args: [now, cutoff, monthlyCutoff],
  });

  // Auto-unpause companies whose pause period has expired
  const companies = r.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
  for (const c of companies) {
    if (c.subscriber_status === 'paused' && c.paused_until && c.paused_until <= now) {
      await db.execute({
        sql: `UPDATE companies SET subscriber_status = 'active', paused_until = NULL WHERE id = ?`,
        args: [c.id],
      });
      c.subscriber_status = 'active';
      c.paused_until = null;
    }
  }
  return companies;
}

// Timeseries queries used by /api/monitoring/timeseries
export async function getMonitoringBySystemDay(
  companyId: string,
  cutoff: string
): Promise<Array<{ ai_system: string; day: string; total: number; mentioned: number; chosen: number }>> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: `SELECT ai_system, date(created_at) AS day, COUNT(*) AS total, SUM(mentioned) AS mentioned, SUM(chosen) AS chosen
          FROM monitoring_results WHERE company_id = ? AND created_at >= ?
          GROUP BY ai_system, day ORDER BY day ASC`,
    args: [companyId, cutoff],
  });
  return r.rows.map(row => ({
    ai_system: row.ai_system as string,
    day: row.day as string,
    total: row.total as number,
    mentioned: row.mentioned as number,
    chosen: row.chosen as number,
  }));
}

export async function getMonitoringByDay(
  companyId: string,
  cutoff: string
): Promise<Array<{ day: string; total: number; mentioned: number; chosen: number }>> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: `SELECT date(created_at) AS day, COUNT(*) AS total, SUM(mentioned) AS mentioned, SUM(chosen) AS chosen
          FROM monitoring_results WHERE company_id = ? AND created_at >= ?
          GROUP BY day ORDER BY day ASC`,
    args: [companyId, cutoff],
  });
  return r.rows.map(row => ({
    day: row.day as string,
    total: row.total as number,
    mentioned: row.mentioned as number,
    chosen: row.chosen as number,
  }));
}

// Admin stats for a single company over date windows
export async function getCompanyPeriodStats(
  companyId: string,
  fromDate: string,
  toDate?: string
): Promise<{ avgScore: number | null; mentionRate: number | null; chosenRate: number | null; total: number }> {
  const db = await ensureInit();
  const sql = toDate
    ? `SELECT AVG(score) AS avgScore, AVG(CAST(mentioned AS REAL)) AS mentionRate, AVG(CAST(chosen AS REAL)) AS chosenRate, COUNT(*) AS total FROM monitoring_results WHERE company_id = ? AND created_at >= ? AND created_at < ?`
    : `SELECT AVG(score) AS avgScore, AVG(CAST(mentioned AS REAL)) AS mentionRate, AVG(CAST(chosen AS REAL)) AS chosenRate, COUNT(*) AS total FROM monitoring_results WHERE company_id = ? AND created_at >= ?`;
  const args = toDate ? [companyId, fromDate, toDate] : [companyId, fromDate];
  const r = await db.execute({ sql, args });
  const row = r.rows[0];
  if (!row) return { avgScore: null, mentionRate: null, chosenRate: null, total: 0 };
  return {
    avgScore: (row.avgScore as number | null) ?? null,
    mentionRate: (row.mentionRate as number | null) ?? null,
    chosenRate: (row.chosenRate as number | null) ?? null,
    total: (row.total as number) || 0,
  };
}

export interface EmailPreferences {
  categories: string[];
  frequency: 'weekly' | 'monthly';
}

export async function updateEmailPreferences(
  companyId: string,
  prefs: EmailPreferences | null,
  unsubscribedAt: string | null | undefined
): Promise<Company | null> {
  const db = await ensureInit();
  const sets: string[] = [];
  const vals: unknown[] = [];

  sets.push('preferences_json = ?');
  vals.push(prefs ? JSON.stringify(prefs) : null);

  if (unsubscribedAt !== undefined) {
    sets.push('unsubscribed_at = ?');
    vals.push(unsubscribedAt);
    if (unsubscribedAt !== null) {
      sets.push('subscriber_status = ?');
      vals.push('unsubscribed');
    }
  }

  vals.push(companyId);
  await db.execute({ sql: `UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, args: vals as never[] });
  return getCompany(companyId);
}

export interface SubscriberPreferences {
  alert_frequency: 'weekly' | 'monthly';
  subscriber_status: 'active' | 'paused' | 'unsubscribed';
  paused_until: string | null;
  branche: string;
  ai_emner: string[];
}

export async function getCompanyByVerificationToken(token: string): Promise<Company | null> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT * FROM companies WHERE verification_token = ?',
    args: [token],
  });
  if (result.rows.length === 0) return null;
  return parseCompanyRow(result.rows[0] as Record<string, unknown>);
}

export async function verifyCompanyEmail(companyId: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE companies SET email_verified = 1, verification_token = NULL, subscriber_status = 'active' WHERE id = ?`,
    args: [companyId],
  });
}

export async function deletePendingExpiredCompanies(): Promise<number> {
  const db = await ensureInit();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const r = await db.execute({
    sql: `DELETE FROM companies WHERE email_verified = 0 AND subscriber_status = 'pending' AND created_at <= ?`,
    args: [cutoff],
  });
  return r.rowsAffected;
}

export async function updateSubscriberPreferences(
  companyId: string,
  prefs: Partial<SubscriberPreferences>
): Promise<Company | null> {
  const db = await ensureInit();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (prefs.alert_frequency !== undefined) { sets.push('alert_frequency = ?'); vals.push(prefs.alert_frequency); }
  if (prefs.subscriber_status !== undefined) { sets.push('subscriber_status = ?'); vals.push(prefs.subscriber_status); }
  if (prefs.paused_until !== undefined) { sets.push('paused_until = ?'); vals.push(prefs.paused_until); }
  if (prefs.branche !== undefined) { sets.push('branche = ?'); vals.push(prefs.branche); }
  if (prefs.ai_emner !== undefined) { sets.push('ai_emner = ?'); vals.push(JSON.stringify(prefs.ai_emner)); }
  if (sets.length === 0) return getCompany(companyId);
  vals.push(companyId);
  await db.execute({ sql: `UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, args: vals as never[] });
  return getCompany(companyId);
}

export async function updateVerificationToken(companyId: string, token: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE companies SET verification_token = ? WHERE id = ?`,
    args: [token, companyId],
  });
}

export async function getCompanyByManagementToken(token: string): Promise<Company | null> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT * FROM companies WHERE management_token = ?',
    args: [token],
  });
  if (result.rows.length === 0) return null;
  return parseCompanyRow(result.rows[0] as Record<string, unknown>);
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  author: string;
  status: 'draft' | 'published';
  published_at: string;
  created_at: string;
}

function parseArticleRow(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    excerpt: row.excerpt as string,
    content: row.content as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    author: (row.author as string) || 'AISignal',
    status: (row.status as 'draft' | 'published') || 'published',
    published_at: row.published_at as string,
    created_at: row.created_at as string,
  };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: "SELECT * FROM articles WHERE slug = ? AND status = 'published'",
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  return parseArticleRow(result.rows[0] as Record<string, unknown>);
}

export async function getPublishedArticles(limit = 50): Promise<Article[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: "SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT ?",
    args: [limit],
  });
  return result.rows.map(row => parseArticleRow(row as Record<string, unknown>));
}

export async function createArticle(article: Omit<Article, 'created_at'>): Promise<Article> {
  const db = await ensureInit();
  await db.execute({
    sql: `INSERT INTO articles (id, title, slug, excerpt, content, tags, author, status, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      article.id,
      article.title,
      article.slug,
      article.excerpt,
      article.content,
      JSON.stringify(article.tags),
      article.author,
      article.status,
      article.published_at,
    ],
  });
  return (await getArticleBySlug(article.slug))!;
}

export async function getAllArticles(limit = 200): Promise<Article[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT * FROM articles ORDER BY created_at DESC LIMIT ?',
    args: [limit],
  });
  return result.rows.map(row => parseArticleRow(row as Record<string, unknown>));
}

export async function updateArticleTags(id: string, tags: string[]): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: 'UPDATE articles SET tags = ? WHERE id = ?',
    args: [JSON.stringify(tags), id],
  });
}

export { ensureInit as getDb };

// ─── NEWSLETTER SUBSCRIBERS ────────────────────────────────────────────────────

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name: string;
  status: 'pending' | 'confirmed';
  confirmation_token: string | null;
  confirmed_at: string | null;
  created_at: string;
}

function parseSubscriberRow(row: Record<string, unknown>): NewsletterSubscriber {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string) || '',
    status: (row.status as 'pending' | 'confirmed') || 'pending',
    confirmation_token: (row.confirmation_token as string | null) ?? null,
    confirmed_at: (row.confirmed_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

export async function createNewsletterSubscriber(
  id: string,
  email: string,
  name: string,
  confirmationToken: string
): Promise<NewsletterSubscriber> {
  const db = await ensureInit();
  await db.execute({
    sql: `INSERT INTO newsletter_subscribers (id, email, name, status, confirmation_token)
          VALUES (?, ?, ?, 'pending', ?)`,
    args: [id, email.toLowerCase().trim(), name.trim(), confirmationToken],
  });
  return (await getNewsletterSubscriberById(id))!;
}

export async function getNewsletterSubscriberById(id: string): Promise<NewsletterSubscriber | null> {
  const db = await ensureInit();
  const r = await db.execute({ sql: 'SELECT * FROM newsletter_subscribers WHERE id = ?', args: [id] });
  if (r.rows.length === 0) return null;
  return parseSubscriberRow(r.rows[0] as Record<string, unknown>);
}

export async function getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM newsletter_subscribers WHERE email = ?',
    args: [email.toLowerCase().trim()],
  });
  if (r.rows.length === 0) return null;
  return parseSubscriberRow(r.rows[0] as Record<string, unknown>);
}

export async function getNewsletterSubscriberByToken(token: string): Promise<NewsletterSubscriber | null> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT * FROM newsletter_subscribers WHERE confirmation_token = ?',
    args: [token],
  });
  if (r.rows.length === 0) return null;
  return parseSubscriberRow(r.rows[0] as Record<string, unknown>);
}

export async function confirmNewsletterSubscriber(id: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE newsletter_subscribers SET status = 'confirmed', confirmed_at = datetime('now'), confirmation_token = NULL WHERE id = ?`,
    args: [id],
  });
}

export async function updateNewsletterConfirmationToken(id: string, token: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: 'UPDATE newsletter_subscribers SET confirmation_token = ? WHERE id = ?',
    args: [token, id],
  });
}

export async function getAllConfirmedNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: "SELECT * FROM newsletter_subscribers WHERE status = 'confirmed' ORDER BY confirmed_at DESC",
    args: [],
  });
  return r.rows.map(row => parseSubscriberRow(row as Record<string, unknown>));
}

export async function logEmail(
  id: string,
  subscriberId: string,
  emailType: string
): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `INSERT INTO email_log (id, subscriber_id, email_type) VALUES (?, ?, ?)`,
    args: [id, subscriberId, emailType],
  });
}

export async function hasEmailBeenSent(subscriberId: string, emailType: string): Promise<boolean> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: 'SELECT id FROM email_log WHERE subscriber_id = ? AND email_type = ? LIMIT 1',
    args: [subscriberId, emailType],
  });
  return r.rows.length > 0;
}

export async function scheduleEmail(
  id: string,
  subscriberId: string,
  emailType: string,
  scheduledAt: string
): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `INSERT INTO scheduled_emails (id, subscriber_id, email_type, scheduled_at) VALUES (?, ?, ?, ?)`,
    args: [id, subscriberId, emailType, scheduledAt],
  });
}

export async function getPendingScheduledEmails(now: string): Promise<Array<{ id: string; subscriber_id: string; email_type: string; scheduled_at: string }>> {
  const db = await ensureInit();
  const r = await db.execute({
    sql: `SELECT id, subscriber_id, email_type, scheduled_at FROM scheduled_emails WHERE status = 'pending' AND scheduled_at <= ? LIMIT 50`,
    args: [now],
  });
  return r.rows as unknown as Array<{ id: string; subscriber_id: string; email_type: string; scheduled_at: string }>;
}

export async function markScheduledEmailSent(id: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE scheduled_emails SET status = 'sent', sent_at = datetime('now') WHERE id = ?`,
    args: [id],
  });
}

export async function markScheduledEmailFailed(id: string): Promise<void> {
  const db = await ensureInit();
  await db.execute({
    sql: `UPDATE scheduled_emails SET status = 'failed' WHERE id = ?`,
    args: [id],
  });
}

export async function getActiveNewsletterSubscribers(): Promise<Company[]> {
  const db = await ensureInit();
  const result = await db.execute({
    sql: "SELECT * FROM companies WHERE subscriber_status = 'active' AND email_verified = 1 ORDER BY created_at ASC",
    args: [],
  });
  return result.rows.map(row => parseCompanyRow(row as Record<string, unknown>));
}
