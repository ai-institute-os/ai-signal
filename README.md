# InsideAI

Self-serve AI monitoring platform. Track how your company is perceived and recommended by AI systems (ChatGPT, Gemini, Perplexity). Get weekly alert digests when your AI visibility changes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Cron Jobs](#cron-jobs)
- [Admin Endpoints](#admin-endpoints)

---

## Prerequisites

- **Node.js** 20+ and npm
- **Turso account** — [turso.tech](https://turso.tech) (free tier available)
- **OpenAI API key** — required for AI monitoring (at least one AI provider key is required)
- **Resend account** — [resend.com](https://resend.com) (optional, required for email alerts)
- **Stripe account** — [stripe.com](https://stripe.com) (optional, required for billing)
- **Vercel account** — recommended for deployment and cron scheduling

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```bash
cp .env.local.example .env.local
```

### Database (Required)

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | LibSQL URL from Turso dashboard, e.g. `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Auth token from Turso dashboard |

The database schema is created automatically on first startup. No manual migrations needed.

### Authentication (Required in production)

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret for signing session tokens. Generate with: `openssl rand -hex 32`. The app falls back to a hardcoded dev secret if unset — **never deploy without this**. |

### AI Providers (At least one required)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (`sk-...`). Used for GPT-4o Mini monitoring queries. Primary provider. |
| `GOOGLE_API_KEY` | Google Gemini API key (`AIza...`). Optional additional provider. |
| `PERPLEXITY_API_KEY` | Perplexity API key (`pplx-...`). Optional additional provider. |

Monitoring runs all configured providers in parallel. A failure in one provider does not block the others.

### Email (Optional — required for alert emails)

| Variable | Default | Description |
|----------|---------|-------------|
| `RESEND_API_KEY` | — | Resend API key (`re_...`). Get from [resend.com/api-keys](https://resend.com/api-keys). |
| `RESEND_FROM_EMAIL` | `InsideAI <alerts@insideai.dk>` | Sender address. Must be a verified Resend domain. |
| `NEXT_PUBLIC_BASE_URL` | `https://insideai.dk` | Base URL used in email links (unsubscribe, preferences, dashboard). |

### Cron & Monitoring

| Variable | Default | Description |
|----------|---------|-------------|
| `CRON_SECRET` | — | Bearer token required on all `/api/cron/*` endpoints. Vercel injects this automatically when using Vercel Cron. Set manually for other platforms. |
| `MONITOR_INTERVAL_HOURS` | `24` | Minimum hours between monitoring runs per company. |

### Stripe (Optional — required for billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`). |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...` or `pk_live_...`). Used client-side for checkout. |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_...`). Found in Stripe dashboard → Webhooks after registering the endpoint. |
| `STRIPE_PRICE_MELLEM` | Stripe Price ID for the Mellem plan (997 DKK/month recurring). |
| `STRIPE_PRICE_STOR` | Stripe Price ID for the Stor plan (2497 DKK/month recurring). |

### Admin

| Variable | Description |
|----------|-------------|
| `ADMIN_SECRET` | Bearer token for `/api/admin/aiscore-activate`. Must match `AISIGNAL_ADMIN_SECRET` in AIScore's environment. |

---

## Database Setup

InsideAI uses [Turso](https://turso.tech) (LibSQL/SQLite-compatible) as its database. The schema bootstraps automatically on first request — no migration CLI required.

### 1. Create a Turso database

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Log in
turso auth login

# Create a database
turso db create insideai

# Get the connection URL
turso db show insideai --url

# Create an auth token
turso db tokens create insideai
```

### 2. Set environment variables

Add the URL and token to `.env.local`:

```env
TURSO_DATABASE_URL=libsql://insideai-yourname.turso.io
TURSO_AUTH_TOKEN=<token from step above>
```

### 3. Schema

The following tables are created automatically on startup:

- **`companies`** — company records, subscription status, alert preferences
- **`monitoring_runs`** — each monitoring execution (pending / done / failed)
- **`monitoring_results`** — per-AI-provider results with scores and sentiment
- **`alerts`** — generated alert notifications

No manual DDL or migration commands are needed.

---

## Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The minimum required environment for local development:

```env
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
OPENAI_API_KEY=sk-...
```

`JWT_SECRET`, email, Stripe, and cron variables are all optional locally — the app will run without them (with email and billing features disabled).

### Triggering a monitoring run manually

While the app is running, you can trigger a scan via the API:

```bash
# Trigger monitoring for a specific company (from the dashboard or admin)
curl -X POST http://localhost:3000/api/monitor/run \
  -H "Content-Type: application/json" \
  -d '{"companyId": "<company-id>"}'
```

To test the cron endpoints locally, include the `CRON_SECRET` as a bearer token:

```bash
curl -X POST http://localhost:3000/api/cron/monitor-all \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Production Deployment

### Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add all environment variables in **Settings → Environment Variables**.
4. Deploy.

Vercel automatically reads `vercel.json` and schedules the cron jobs. No additional configuration is needed for cron.

### Stripe webhook

After deploying, register the webhook endpoint in the Stripe dashboard:

1. Go to **Stripe Dashboard → Webhooks → Add endpoint**.
2. Set the endpoint URL to `https://your-domain.com/api/webhooks/stripe`.
3. Subscribe to these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** (`whsec_...`) and set it as `STRIPE_WEBHOOK_SECRET`.

For local Stripe webhook testing, use the Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### Stripe products and prices

Create two recurring prices in the Stripe dashboard (test mode first):

| Plan | Amount | Interval | Environment variable |
|------|--------|----------|----------------------|
| Mellem | 997 DKK | Monthly | `STRIPE_PRICE_MELLEM` |
| Stor | 2497 DKK | Monthly | `STRIPE_PRICE_STOR` |

Copy the Price IDs (format `price_...`) to your environment variables.

### Resend domain verification

1. Add your sending domain in [Resend](https://resend.com/domains).
2. Follow the DNS verification steps.
3. Set `RESEND_FROM_EMAIL` to an address on that verified domain.

---

## Cron Jobs

Two scheduled jobs are defined in `vercel.json` and run automatically on Vercel:

### `POST /api/cron/monitor-all`

**Schedule:** Every Monday at 08:00 UTC (`0 8 * * 1`)  
**Max duration:** 300 seconds

Runs the weekly monitoring cycle:

1. Expires premium trials past their end date.
2. Sends trial warning emails (10 days before and 2 days before expiry).
3. Sends upsell emails to free-plan companies with 3+ monitoring runs.
4. Runs AI monitoring for all companies due for an update (based on `MONITOR_INTERVAL_HOURS` and each company's `alert_frequency` preference).

### `POST /api/cron/stripe-activate`

**Schedule:** Daily at 06:00 UTC (`0 6 * * *`)

Handles automatic trial-to-paid conversion:

1. Companies that completed their 90-day trial and have a valid payment method are converted to the Mellem plan.
2. Companies without a payment method are downgraded to the free plan.

### Authentication

Both endpoints require:

```
Authorization: Bearer <CRON_SECRET>
```

Vercel injects `CRON_SECRET` automatically. For other platforms or local testing, set it manually and include the header.

---

## Admin Endpoints

### `POST /api/admin/aiscore-activate`

Activates a company's InsideAI premium trial. Called by AIScore after a company purchases an AI report.

**Auth:** `Authorization: Bearer <ADMIN_SECRET>`

**Body:**
```json
{ "companyId": "<company-id>" }
```

The `ADMIN_SECRET` must match `AISIGNAL_ADMIN_SECRET` in AIScore's environment.
