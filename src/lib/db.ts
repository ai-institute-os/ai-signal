import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'aisignal.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  initSchema(_db);
  return _db;
}

function addColumnIfMissing(db: Database.Database, table: string, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // Column already exists — ignore
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      email TEXT NOT NULL,
      category TEXT NOT NULL,
      competitors TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'active'
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

    CREATE INDEX IF NOT EXISTS idx_results_company ON monitoring_results(company_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_alerts_company ON alerts(company_id, seen);
  `);

  // Add new columns with IF NOT EXISTS fallback
  addColumnIfMissing(db, 'companies', 'country', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, 'companies', 'password', "TEXT NOT NULL DEFAULT ''");
  addColumnIfMissing(db, 'monitoring_results', 'sentiment', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'companies', 'products_purchased', "TEXT NOT NULL DEFAULT '[]'");
  addColumnIfMissing(db, 'companies', 'aisignal_plan', "TEXT NOT NULL DEFAULT 'free'");
  addColumnIfMissing(db, 'companies', 'trial_ends_at', 'TEXT');
  addColumnIfMissing(db, 'companies', 'upsell_count', 'INTEGER NOT NULL DEFAULT 0');
  // Stripe billing columns
  addColumnIfMissing(db, 'companies', 'stripe_customer_id', 'TEXT');
  addColumnIfMissing(db, 'companies', 'stripe_subscription_id', 'TEXT');
  addColumnIfMissing(db, 'companies', 'stripe_subscription_status', 'TEXT');
  addColumnIfMissing(db, 'companies', 'stripe_price_id', 'TEXT');
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

export function createCompany(
  id: string,
  name: string,
  domain: string,
  email: string,
  category: string,
  competitors: string[],
  country: string,
  password: string
): Company {
  const db = getDb();
  db.prepare(`
    INSERT INTO companies (id, name, domain, email, category, competitors, country, password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, domain, email, category, JSON.stringify(competitors), country, password);
  return getCompany(id)!;
}

export function getCompany(id: string): Company | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...row,
    competitors: JSON.parse(row.competitors as string),
    products_purchased: JSON.parse((row.products_purchased as string) || '[]'),
  } as Company;
}

export function getCompanyByEmail(email: string): Company | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM companies WHERE email = ?').get(email.toLowerCase().trim()) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...row,
    competitors: JSON.parse(row.competitors as string),
    products_purchased: JSON.parse((row.products_purchased as string) || '[]'),
  } as Company;
}

export function activateAISignalPremiumTrial(companyId: string): void {
  const db = getDb();
  const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const company = getCompany(companyId);
  if (!company) return;
  const purchased = company.products_purchased;
  if (!purchased.includes('aiscore')) purchased.push('aiscore');
  db.prepare(`
    UPDATE companies
    SET aisignal_plan = 'premium',
        trial_ends_at = ?,
        products_purchased = ?
    WHERE id = ?
  `).run(trialEndsAt, JSON.stringify(purchased), companyId);
}

export function getNextUpsellRecommendation(companyId: string): { recommendation: 'aiscore' | 'aiselect'; count: number } {
  const db = getDb();
  const company = getCompany(companyId);
  if (!company) throw new Error('Company not found');

  const count = company.upsell_count;
  const hasPurchasedAIScore = company.products_purchased.includes('aiscore');

  let recommendation: 'aiscore' | 'aiselect';
  if (hasPurchasedAIScore) {
    recommendation = 'aiselect';
  } else {
    // 10-item cycle: positions 0-4 → AIScore, positions 5-9 → AISelect
    recommendation = (count % 10) < 5 ? 'aiscore' : 'aiselect';
  }

  db.prepare('UPDATE companies SET upsell_count = upsell_count + 1 WHERE id = ?').run(companyId);
  return { recommendation, count: count + 1 };
}

export function createMonitoringRun(id: string, companyId: string): MonitoringRun {
  const db = getDb();
  db.prepare(`
    INSERT INTO monitoring_runs (id, company_id) VALUES (?, ?)
  `).run(id, companyId);
  return db.prepare('SELECT * FROM monitoring_runs WHERE id = ?').get(id) as MonitoringRun;
}

export function updateRunStatus(id: string, status: string) {
  getDb().prepare('UPDATE monitoring_runs SET status = ? WHERE id = ?').run(status, id);
}

export function saveMonitoringResult(result: Omit<MonitoringResult, 'created_at'>) {
  const db = getDb();
  db.prepare(`
    INSERT INTO monitoring_results (id, run_id, company_id, ai_system, prompt_type, prompt, response, mentioned, chosen, score, sentiment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.id, result.run_id, result.company_id, result.ai_system,
    result.prompt_type, result.prompt, result.response,
    result.mentioned, result.chosen, result.score, result.sentiment
  );
}

export function getCompanyResults(companyId: string, limit = 100): MonitoringResult[] {
  return getDb().prepare(`
    SELECT * FROM monitoring_results
    WHERE company_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(companyId, limit) as MonitoringResult[];
}

export function getResultsByRunId(runId: string): MonitoringResult[] {
  return getDb().prepare(`
    SELECT * FROM monitoring_results WHERE run_id = ? ORDER BY created_at DESC
  `).all(runId) as MonitoringResult[];
}

export function getLastTwoRunIds(companyId: string): string[] {
  const rows = getDb().prepare(`
    SELECT id FROM monitoring_runs
    WHERE company_id = ? AND status = 'done'
    ORDER BY created_at DESC LIMIT 2
  `).all(companyId) as { id: string }[];
  return rows.map(r => r.id);
}

export function getCompanyAlerts(companyId: string): Alert[] {
  return getDb().prepare(`
    SELECT * FROM alerts WHERE company_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(companyId) as Alert[];
}

export function createAlert(id: string, companyId: string, type: string, message: string) {
  getDb().prepare(`
    INSERT INTO alerts (id, company_id, type, message) VALUES (?, ?, ?, ?)
  `).run(id, companyId, type, message);
}

export function markAlertSeen(alertId: string) {
  getDb().prepare('UPDATE alerts SET seen = 1 WHERE id = ?').run(alertId);
}

export function getLatestRunForCompany(companyId: string): MonitoringRun | null {
  return getDb().prepare(`
    SELECT * FROM monitoring_runs WHERE company_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(companyId) as MonitoringRun | null;
}

export function getRunCount(companyId: string): number {
  const row = getDb().prepare(
    'SELECT COUNT(*) as cnt FROM monitoring_runs WHERE company_id = ? AND status = ?'
  ).get(companyId, 'done') as { cnt: number };
  return row.cnt;
}

export function updateCompanyPassword(id: string, hashedPassword: string): void {
  getDb().prepare('UPDATE companies SET password = ? WHERE id = ?').run(hashedPassword, id);
}

export function updateCompany(
  id: string,
  fields: Partial<Pick<Company, 'name' | 'domain' | 'email' | 'category' | 'country' | 'competitors'>>
): Company | null {
  const db = getDb();
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
  db.prepare(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getCompany(id);
}

export function getExpiredTrialCompanies(): Company[] {
  const now = new Date().toISOString();
  const rows = getDb().prepare(`
    SELECT * FROM companies
    WHERE aisignal_plan = 'premium'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at <= ?
  `).all(now) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...r,
    competitors: JSON.parse(r.competitors as string),
    products_purchased: JSON.parse((r.products_purchased as string) || '[]'),
  } as Company));
}

export function expireTrialForCompany(companyId: string): void {
  getDb().prepare(`
    UPDATE companies
    SET aisignal_plan = 'free',
        trial_ends_at = NULL
    WHERE id = ?
  `).run(companyId);
}

export function getAllActiveCompanies(): Company[] {
  const rows = getDb().prepare(
    "SELECT * FROM companies WHERE status = 'active' ORDER BY created_at ASC"
  ).all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...r,
    competitors: JSON.parse(r.competitors as string),
    products_purchased: JSON.parse((r.products_purchased as string) || '[]'),
  } as Company));
}

export function updateStripeCustomer(companyId: string, stripeCustomerId: string): void {
  getDb().prepare('UPDATE companies SET stripe_customer_id = ? WHERE id = ?').run(stripeCustomerId, companyId);
}

export function updateStripeSubscription(
  companyId: string,
  subscriptionId: string,
  status: string,
  priceId: string,
  plan: 'free' | 'premium'
): void {
  getDb().prepare(`
    UPDATE companies
    SET stripe_subscription_id = ?,
        stripe_subscription_status = ?,
        stripe_price_id = ?,
        aisignal_plan = ?,
        trial_ends_at = NULL
    WHERE id = ?
  `).run(subscriptionId, status, priceId, plan, companyId);
}

export function cancelStripeSubscription(companyId: string): void {
  getDb().prepare(`
    UPDATE companies
    SET aisignal_plan = 'free',
        stripe_subscription_id = NULL,
        stripe_subscription_status = 'canceled',
        stripe_price_id = NULL
    WHERE id = ?
  `).run(companyId);
}

export function getCompanyByStripeCustomerId(stripeCustomerId: string): Company | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM companies WHERE stripe_customer_id = ?').get(stripeCustomerId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    ...row,
    competitors: JSON.parse(row.competitors as string),
    products_purchased: JSON.parse((row.products_purchased as string) || '[]'),
  } as Company;
}

// Companies whose 90-day trial has expired and have no active Stripe subscription yet
export function getCompaniesReadyForStripeActivation(): Company[] {
  const now = new Date().toISOString();
  const rows = getDb().prepare(`
    SELECT * FROM companies
    WHERE aisignal_plan = 'premium'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at <= ?
    AND (stripe_subscription_id IS NULL OR stripe_subscription_status = 'trialing')
  `).all(now) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...r,
    competitors: JSON.parse(r.competitors as string),
    products_purchased: JSON.parse((r.products_purchased as string) || '[]'),
  } as Company));
}

export function getCompaniesNeedingRun(olderThanHours: number): Company[] {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];
  const rows = getDb().prepare(`
    SELECT c.* FROM companies c
    WHERE c.status = 'active'
    AND (
      NOT EXISTS (
        SELECT 1 FROM monitoring_runs r
        WHERE r.company_id = c.id AND r.status = 'done'
        AND r.created_at > ?
      )
    )
    ORDER BY c.created_at ASC
  `).all(cutoff) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    ...r,
    competitors: JSON.parse(r.competitors as string),
    products_purchased: JSON.parse((r.products_purchased as string) || '[]'),
  } as Company));
}
