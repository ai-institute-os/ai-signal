export interface TopStory {
  headline: string;
  summary: string;
}

export interface WeeklyReportData {
  subscriberName: string;
  weekDate: string;
  topStory: TopStory;
  insights: string[];
  unsubscribeLink: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function insightItem(text: string, isLast: boolean): string {
  const borderBottom = isLast ? 'none' : '1px solid rgba(0,212,255,0.08)';
  return `
      <tr>
        <td style="padding:12px 0;border-bottom:${borderBottom};vertical-align:top;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="18" style="vertical-align:top;padding-top:2px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#00D4FF;margin-top:5px;"></span>
              </td>
              <td style="padding-left:10px;">
                <p style="margin:0;font-size:14px;color:#CBD5E1;line-height:1.6;">${escapeHtml(text)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
}

export function weeklyReportEmail(data: WeeklyReportData): string {
  const { subscriberName, weekDate, topStory, insights, unsubscribeLink } = data;

  const insightRows = insights
    .map((item, i) => insightItem(item, i === insights.length - 1))
    .join('');

  const body = `
    <!-- Eyebrow label -->
    <p style="margin:0 0 6px;font-size:11px;color:#00D4FF;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Ugentlig AI-opdatering</p>

    <!-- Headline -->
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#F0F6FF;line-height:1.25;letter-spacing:-0.5px;">
      Ugens AI-bevægelser
    </h1>
    <p style="margin:0 0 28px;font-size:12px;color:#4A6080;">${escapeHtml(weekDate)}</p>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="height:1px;background:rgba(0,212,255,0.12);"></td></tr>
    </table>

    <!-- Greeting -->
    <p style="margin:0 0 24px;font-size:14px;color:#94A3B8;line-height:1.6;">
      Hej ${escapeHtml(subscriberName)},<br>
      her er de vigtigste AI-signaler fra denne uge — kort, præcist og relevant.
    </p>

    <!-- Top story -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:rgba(0,212,255,0.07);border:1px solid rgba(0,212,255,0.22);border-radius:12px;padding:22px 24px;">
          <p style="margin:0 0 10px;font-size:10px;color:#00D4FF;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">Ugens top-nyhed</p>
          <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:#F0F6FF;line-height:1.35;">${escapeHtml(topStory.headline)}</p>
          <p style="margin:0;font-size:13px;color:#94A3B8;line-height:1.65;">${escapeHtml(topStory.summary)}</p>
        </td>
      </tr>
    </table>

    <!-- Insights headline -->
    <p style="margin:0 0 4px;font-size:12px;color:#4A6080;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Ugens indsigter</p>

    <!-- Insights list -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${insightRows}
    </table>

    <!-- Divider -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="height:1px;background:rgba(0,212,255,0.08);"></td></tr>
    </table>

    <!-- Closing -->
    <p style="margin:0;font-size:12px;color:#2A3F5A;line-height:1.7;">
      AISignal observerer og rapporterer — alle beslutninger er dine.<br>
      <a href="${unsubscribeLink}" style="color:#4A6080;text-decoration:none;">Afmeld nyhedsbrev</a>
    </p>`;

  return `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ugentlig AI-opdatering — AISignal</title>
</head>
<body style="margin:0;padding:0;background:#060D1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060D1A;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">

          <!-- Logo header -->
          <tr>
            <td style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:linear-gradient(135deg,#00D4FF,#0099BB);border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                          <span style="color:#0A1628;font-weight:800;font-size:13px;">AI</span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="color:#fff;font-weight:700;font-size:17px;letter-spacing:-0.4px;">AISignal</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="font-size:11px;color:#4A6080;text-transform:uppercase;letter-spacing:0.8px;">Ugentlig rapport</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:#0A1628;border:1px solid rgba(0,212,255,0.15);border-radius:16px;overflow:hidden;">

              <!-- Cyan top accent bar -->
              <tr>
                <td style="height:3px;background:linear-gradient(90deg,#00D4FF,#0099BB,transparent);font-size:0;line-height:0;">&nbsp;</td>
              </tr>

              <!-- Card body -->
              <tr>
                <td style="padding:32px 32px 28px;">
                  ${body}
                </td>
              </tr>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#2A3F5A;line-height:1.8;">
                Du modtager dette nyhedsbrev fordi du er tilmeldt AISignal.<br>
                © 2026 AISignal · AI-synlighedsmonitorering
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
