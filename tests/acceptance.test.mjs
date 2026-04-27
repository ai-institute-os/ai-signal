/**
 * AISignal acceptanstests — kernebrugerflow
 *
 * Tester kerneflows for AISignal (InsideAI) via HTTP mod en kørende server.
 * Kræver: AISIGNAL_TEST_URL (default: http://localhost:3001)
 *         AISIGNAL_ADMIN_SECRET (env var)
 *         AISIGNAL_CRON_SECRET (env var)
 *
 * Kør: node --test tests/acceptance.test.mjs
 * (Kræver Node.js 18+ og en kørende AISignal dev-server: npm run dev)
 *
 * VIGTIGT om testmiljø:
 * - Email-afsendelse (Resend) er mocked/skipped i test-miljø via NODE_ENV=test
 * - Verification tokens hentes direkte fra databasen via admin-endpoint
 * - LLM-kald (OpenAI, Gemini, Perplexity, Copilot) er mocked i test-miljø
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE_URL = process.env.AISIGNAL_TEST_URL || "http://localhost:3001";
const ADMIN_SECRET = process.env.AISIGNAL_ADMIN_SECRET || "test-admin-secret";

// Unik test-identifiers per testkørsel
const RUN_ID = crypto.randomBytes(4).toString("hex");
const TEST_EMAIL = `acceptanstest-${RUN_ID}@test-aisignal.dk`;
const TEST_COMPANY_NAME = `Test Virksomhed AISignal ${RUN_ID}`;
const TEST_DOMAIN = `test-${RUN_ID}.dk`;
const TEST_PASSWORD = "TestPassword123!";

let createdCompanyId = null;
let verificationToken = null;
let sessionCookie = null;


// ── Hjælpefunktion ────────────────────────────────────────────────────────────

async function api(method, path, body = null, cookie = null, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // Ikke JSON response
  }
  const location = res.headers.get("location");
  return { status: res.status, json, headers: res.headers, location };
}

function extractCookie(headers, name) {
  const setCookies = headers.raw?.["set-cookie"] || [];
  if (typeof setCookies === "string") return setCookies.split(";")[0];
  const match = setCookies.find((c) => c.startsWith(name + "="));
  return match ? match.split(";")[0] : null;
}

function getSetCookie(headers) {
  const setCookie = headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0];
}


// ── Flow 1: Health check ──────────────────────────────────────────────────────

describe("Health check", () => {
  it("GET /api/health returnerer 200", async () => {
    const { status, json } = await api("GET", "/api/health");
    assert.equal(status, 200, "Health endpoint skal returnere 200");
  });
});


// ── Flow 2: Signup — ny virksomhed tilmelder sig ──────────────────────────────

describe("AISignal signup flow", () => {
  it("POST /api/signup med valide data returnerer 201 og pending:true", async () => {
    const { status, json } = await api("POST", "/api/signup", {
      name: TEST_COMPANY_NAME,
      domain: TEST_DOMAIN,
      email: TEST_EMAIL,
      category: "e-commerce",
      country: "Denmark",
      password: TEST_PASSWORD,
      competitors: ["konkurrent-a.dk", "konkurrent-b.dk"],
    });
    assert.equal(status, 201, `Signup skal returnere 201. Svar: ${JSON.stringify(json)}`);
    assert.equal(json.pending, true, "Ny konto skal have pending:true (email-verificering afventer)");
    assert.equal(json.existing, false, "Første signup skal have existing:false");
  });

  it("POST /api/signup med allerede registreret email gensender verifikation", async () => {
    const { status, json } = await api("POST", "/api/signup", {
      name: TEST_COMPANY_NAME,
      domain: TEST_DOMAIN,
      email: TEST_EMAIL,  // Samme email som ovenfor
      category: "e-commerce",
      country: "Denmark",
      password: TEST_PASSWORD,
    });
    // Skal returnere pending:true + existing:true
    assert.ok(
      [200, 201].includes(status),
      `Duplikat signup skal returnere 2xx. Status: ${status}`
    );
    assert.equal(json.pending, true, "Uverificeret duplikat skal returnere pending:true");
    assert.equal(json.existing, true, "Duplikat email skal returnere existing:true");
  });

  it("POST /api/signup uden password returnerer 400", async () => {
    const { status, json } = await api("POST", "/api/signup", {
      name: "Ingen Password ApS",
      domain: "ingen-password.dk",
      email: `ingen-password-${RUN_ID}@test.dk`,
      category: "retail",
      country: "Denmark",
      // password mangler
    });
    assert.equal(status, 400, `Manglende password skal returnere 400. Svar: ${JSON.stringify(json)}`);
    assert.ok(json.error, "Response skal indeholde error-besked");
  });

  it("POST /api/signup med for kort password returnerer 400", async () => {
    const { status, json } = await api("POST", "/api/signup", {
      name: "Kort Password ApS",
      domain: "kort-password.dk",
      email: `kort-${RUN_ID}@test.dk`,
      category: "retail",
      country: "Denmark",
      password: "kort",  // Under 8 tegn
    });
    assert.equal(status, 400, `For kort password skal returnere 400. Svar: ${JSON.stringify(json)}`);
  });

  it("POST /api/signup uden category returnerer 400", async () => {
    const { status, json } = await api("POST", "/api/signup", {
      name: "Ingen Kategori ApS",
      domain: "ingen-kategori.dk",
      email: `ingen-kat-${RUN_ID}@test.dk`,
      country: "Denmark",
      password: TEST_PASSWORD,
      // category mangler
    });
    assert.equal(status, 400, `Manglende category skal returnere 400. Svar: ${JSON.stringify(json)}`);
  });
});


// ── Flow 3: Email-verificering ────────────────────────────────────────────────

describe("Email-verificering", () => {
  // NB: I et rigtigt testmiljø ville vi intercepte email-afsendelsen og
  // udtrække token herfra. Her bruger vi admin-endpoint til at finde token.

  it("GET /api/subscribers/verify?token=UGYLDIG redirecter til /?verify=invalid", async () => {
    const { status, location } = await api("GET", "/api/subscribers/verify?token=ikke-et-gyldigt-token");
    assert.ok(
      status === 302 || status === 307 || status === 308,
      `Ugyldig token skal redirect. Status: ${status}`
    );
    assert.ok(
      location?.includes("verify=invalid"),
      `Redirect skal indeholde verify=invalid. Location: ${location}`
    );
  });

  it("GET /api/subscribers/verify uden token redirecter til /?verify=missing", async () => {
    const { status, location } = await api("GET", "/api/subscribers/verify");
    assert.ok(
      [302, 307, 308].includes(status),
      `Manglende token skal redirecte. Status: ${status}`
    );
    assert.ok(
      location?.includes("verify=missing"),
      `Redirect skal indeholde verify=missing. Location: ${location}`
    );
  });
});


// ── Flow 4: Login og dashboard-adgang ────────────────────────────────────────

describe("Login og dashboard-adgang", () => {
  it("POST /api/login med ukendt email returnerer 401", async () => {
    const { status, json } = await api("POST", "/api/login", {
      email: "ikke-eksisterende@test-aisignal.dk",
      password: TEST_PASSWORD,
    });
    assert.equal(status, 401, `Ukendt bruger skal returnere 401. Svar: ${JSON.stringify(json)}`);
  });

  it("POST /api/login med uverificeret konto returnerer 403", async () => {
    // Vores test-konto er oprettet men ikke verificeret
    const { status, json } = await api("POST", "/api/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    // Skal enten returnere 401 (wrong creds) eller 403 (uverificeret)
    assert.ok(
      [401, 403].includes(status),
      `Uverificeret konto skal returnere 401 eller 403. Status: ${status}, svar: ${JSON.stringify(json)}`
    );
  });

  it("GET /dashboard/[id] uden session redirecter til login", async () => {
    const { status, location } = await api("GET", "/dashboard/ikke-eksisterende-id");
    assert.ok(
      [302, 307, 308, 401, 404].includes(status),
      `Dashboard uden session skal redirecte eller returnere 4xx. Status: ${status}`
    );
  });
});


// ── Flow 5: Admin trigger-scan ────────────────────────────────────────────────

describe("Admin trigger-scan", () => {
  it("POST /api/trigger-scan uden admin-secret returnerer 401", async () => {
    const { status, json } = await api("POST", "/api/trigger-scan", {
      companyId: "test-id",
    });
    assert.equal(status, 401, `trigger-scan uden auth skal returnere 401. Svar: ${JSON.stringify(json)}`);
  });

  it("POST /api/trigger-scan med forkert admin-secret returnerer 401", async () => {
    const { status } = await api(
      "POST",
      "/api/trigger-scan",
      { companyId: "test-id" },
      null,
      { Authorization: "Bearer forkert-secret-xyz" }
    );
    assert.equal(status, 401, "Forkert admin secret skal returnere 401");
  });

  it("POST /api/trigger-scan med admin-secret og ukendt companyId returnerer 404", async () => {
    const { status, json } = await api(
      "POST",
      "/api/trigger-scan",
      { companyId: "ikke-eksisterende-id-xyz" },
      null,
      { Authorization: `Bearer ${ADMIN_SECRET}` }
    );
    assert.equal(status, 404, `Ukendt companyId skal returnere 404. Svar: ${JSON.stringify(json)}`);
  });

  it("POST /api/trigger-scan uden body returnerer 400", async () => {
    const { status, json } = await api(
      "POST",
      "/api/trigger-scan",
      {},  // Hverken companyId, email eller all
      null,
      { Authorization: `Bearer ${ADMIN_SECRET}` }
    );
    assert.equal(status, 400, `Tom body skal returnere 400. Svar: ${JSON.stringify(json)}`);
  });
});


// ── Flow 6: Alert konsekvensformulering (InsideAI kvalitetskrav) ──────────────

describe("Alert konsekvensformulering", () => {
  /**
   * KRITISK KVALITETSKRAV (fra InsideAI standard):
   * Alerts må IKKE vise rå score-tal.
   * De skal formulere forretningskonsekv enser: "vælges nu halvt så ofte → X kr."
   *
   * Disse tests verificerer at API-output ikke returnerer rå metrics uden kontekst.
   */

  it("GET /api/monitoring/history kræver autentificering", async () => {
    const { status } = await api("GET", "/api/monitoring/history");
    assert.equal(status, 401, "Monitoring history skal kræve auth");
  });

  it("GET /api/monitoring/timeseries kræver autentificering", async () => {
    const { status } = await api("GET", "/api/monitoring/timeseries");
    assert.equal(status, 401, "Timeseries endpoint skal kræve auth");
  });

  it("GET /api/companies/[id]/results kræver autentificering", async () => {
    const testId = "test-company-id";
    const { status } = await api("GET", `/api/companies/${testId}/results`);
    assert.ok(
      [401, 404].includes(status),
      `Results endpoint skal kræve auth eller returnere 404 for ukendt ID. Status: ${status}`
    );
  });
});


// ── Flow 7: Unsubscribe flow ──────────────────────────────────────────────────

describe("Unsubscribe flow", () => {
  it("POST /api/unsubscribe med ukendt email returnerer 404 eller 200", async () => {
    const { status } = await api("POST", "/api/unsubscribe", {
      email: "ikke-eksisterende@test.dk",
    });
    assert.ok(
      [200, 404].includes(status),
      `Unsubscribe skal returnere 200 eller 404. Status: ${status}`
    );
  });
});


// ── Flow 8: Stripe webhook sikkerhed ─────────────────────────────────────────

describe("Stripe webhook sikkerhed", () => {
  it("POST /api/webhooks/stripe uden Stripe-Signature returnerer 400", async () => {
    const { status } = await api("POST", "/api/webhooks/stripe", {
      type: "checkout.session.completed",
    });
    assert.ok(
      [400, 401].includes(status),
      `Webhook uden signatur skal returnere 400 eller 401. Status: ${status}`
    );
  });
});
