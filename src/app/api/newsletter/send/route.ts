import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Resend } from 'resend';
import { getActiveNewsletterSubscribers, getPublishedArticles, Article } from '@/lib/db';
import { signSubscriberToken } from '@/lib/auth';

export const maxDuration = 300;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AISignal <newsletter@aisignal.dk>';
const BASE_URL = () => process.env.NEXT_PUBLIC_BASE_URL || 'https://aisignal.dk';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDanishDate(date: Date): string {
  const months = [
    'januar', 'februar', 'marts', 'april', 'maj', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'december',
  ];
  return `${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function articleVars(
  article: Article | undefined,
  prefix: string,
  base: string
): Record<string, string> {
  if (!article) {
    return {
      [`{{ ${prefix}_url }}`]: base,
      [`{{ ${prefix}_image_url }}`]: `${base}/images/newsletter-placeholder.jpg`,
      [`{{ ${prefix}_image_alt }}`]: 'AI nyhed',
      [`{{ ${prefix}_category }}`]: 'AI',
      [`{{ ${prefix}_headline }}`]: 'Kommende artikel',
      [`{{ ${prefix}_summary }}`]: 'Ny artikel er på vej.',
    };
  }
  return {
    [`{{ ${prefix}_url }}`]: `${base}/artikler/${article.slug}`,
    [`{{ ${prefix}_image_url }}`]: `${base}/images/articles/${article.slug}.jpg`,
    [`{{ ${prefix}_image_alt }}`]: escapeHtml(article.title),
    [`{{ ${prefix}_category }}`]: escapeHtml(article.tags[0] || 'AI'),
    [`{{ ${prefix}_headline }}`]: escapeHtml(article.title),
    [`{{ ${prefix}_summary }}`]: escapeHtml(article.excerpt),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('Newsletter: CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    console.error('Newsletter: RESEND_API_KEY not configured');
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });
  }

  const templatePath = join(process.cwd(), 'templates', 'newsletter_email.html');
  let template: string;
  try {
    template = readFileSync(templatePath, 'utf-8');
  } catch (err) {
    console.error('Newsletter: failed to read email template:', err);
    return NextResponse.json({ error: 'Email template not found' }, { status: 500 });
  }

  const [subscribers, articles] = await Promise.all([
    getActiveNewsletterSubscribers(),
    getPublishedArticles(4),
  ]);

  if (articles.length === 0) {
    console.warn('Newsletter: no published articles available');
    return NextResponse.json({ error: 'No published articles to send' }, { status: 422 });
  }

  const base = BASE_URL();
  const now = new Date();
  const issueDate = formatDanishDate(now);
  const currentYear = now.getFullYear().toString();

  const featured = articles[0];
  const emailSubject = `AISignal Nyhedsbrev — ${issueDate}`;

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      const subscriberToken = await signSubscriberToken(subscriber.id);
      const unsubscribeUrl = `${base}/api/unsubscribe?token=${subscriberToken}`;
      const preferencesUrl = `${base}/mine-praeferencer?token=${subscriberToken}`;

      const replacements: Record<string, string> = {
        '{{ email_subject }}': escapeHtml(emailSubject),
        '{{ preheader_text }}': escapeHtml(`Ugens vigtigste AI-nyheder — ${featured.title}`),
        '{{ issue_date }}': issueDate,
        '{{ header_subtitle }}': 'Ugens vigtigste AI-nyheder og tendenser, kurateret til dig.',
        '{{ featured_article_url }}': `${base}/artikler/${featured.slug}`,
        '{{ featured_article_image_url }}': `${base}/images/articles/${featured.slug}.jpg`,
        '{{ featured_article_image_alt }}': escapeHtml(featured.title),
        '{{ featured_article_category }}': escapeHtml(featured.tags[0] || 'AI'),
        '{{ featured_article_headline }}': escapeHtml(featured.title),
        '{{ featured_article_summary }}': escapeHtml(featured.excerpt),
        '{{ website_url }}': base,
        '{{ archive_url }}': `${base}/arkiv`,
        '{{ privacy_url }}': `${base}/privatlivspolitik`,
        '{{ contact_url }}': `${base}/kontakt`,
        '{{ unsubscribe_url }}': unsubscribeUrl,
        '{{ preferences_url }}': preferencesUrl,
        '{{ current_year }}': currentYear,
        ...articleVars(articles[1], 'news_1', base),
        ...articleVars(articles[2], 'news_2', base),
        ...articleVars(articles[3], 'news_3', base),
      };

      let html = template;
      for (const [placeholder, value] of Object.entries(replacements)) {
        html = html.replaceAll(placeholder, value);
      }

      await resend.emails.send({
        from: FROM_EMAIL,
        to: subscriber.email,
        subject: emailSubject,
        html,
      });

      sent++;
    } catch (err) {
      console.error(`Newsletter: failed for subscriber ${subscriber.id}:`, err);
      failed++;
    }
  }

  console.log(`Newsletter: sent=${sent} failed=${failed} total=${subscribers.length}`);
  return NextResponse.json({ sent, failed, total: subscribers.length });
}
