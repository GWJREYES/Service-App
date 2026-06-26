// Vercel serverless function — emails the appointment report to the manager.
// Uses the Resend REST API directly (no npm dependency). Deploy this with the
// rest of the project to Vercel; set RESEND_API_KEY (and optionally REPORT_FROM)
// in the project's Environment Variables.
//
// Request body (JSON): { to, subject, html, text, attachments: [{ filename, dataUrl }] }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'RESEND_API_KEY is not configured on the server.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { to, subject, html, text, attachments } = body;

    if (!to || !subject) {
      res.status(400).json({ error: 'Missing "to" or "subject".' });
      return;
    }

    // The "from" address must be on a domain you've verified in Resend.
    // Until you verify groundworks.com, Resend's onboarding@resend.dev works
    // for sending to the account owner's own email (good enough to test).
    const from = process.env.REPORT_FROM || 'Groundworks SERVICE <onboarding@resend.dev>';

    const atts = (attachments || [])
      .map((a, i) => ({
        filename: a.filename || ('photo-' + (i + 1) + '.jpg'),
        content: (a.dataUrl || '').includes(',') ? a.dataUrl.split(',')[1] : (a.content || ''),
      }))
      .filter(a => a.content);

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html, text, attachments: atts }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      res.status(resp.status).json({ error: data.message || data || 'Resend error' });
      return;
    }
    res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
