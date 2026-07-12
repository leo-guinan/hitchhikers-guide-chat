export type EmailDeliveryResult = {
  sent: boolean;
  provider: 'resend' | 'not_configured';
  messageId?: string;
  error?: string;
};

export async function sendSignInCodeEmail(input: { email: string; code: string; expiresAt: string }): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.GUIDE_EMAIL_FROM;
  if (!apiKey || !from) {
    return { sent: false, provider: 'not_configured', error: 'Email delivery is not configured. Set RESEND_API_KEY and GUIDE_EMAIL_FROM.' };
  }

  const subject = 'Your Hitchhiker\'s Guide sign-in code';
  const minutes = Math.max(1, Math.round((Date.parse(input.expiresAt) - Date.now()) / 60_000));
  const text = [
    `Your sign-in code is ${input.code}.`,
    '',
    `It expires in about ${minutes} minutes.`,
    '',
    'If you did not request this, ignore this email. The Guide will cope. Eventually.',
  ].join('\n');
  const html = `<!doctype html><html><body style="background:#0b0814;color:#eae2d0;font-family:Arial,sans-serif;padding:28px"><div style="max-width:560px;margin:0 auto;border:1px solid rgba(212,169,78,.28);border-radius:14px;padding:24px;background:#120d1e"><p style="color:#d4a94e;text-transform:uppercase;letter-spacing:.18em;font-size:12px">Hitchhiker's Guide to the Future</p><h1 style="font-size:28px;margin:18px 0;color:#eae2d0">Your sign-in code</h1><p style="font-size:34px;letter-spacing:.18em;color:#d4a94e;font-weight:700;margin:18px 0">${escapeHtml(input.code)}</p><p style="color:#9d92ae">It expires in about ${minutes} minutes.</p><p style="color:#9d92ae;font-size:13px">If you did not request this, ignore this email. The Guide will cope. Eventually.</p></div></body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.email],
        subject,
        text,
        html,
        reply_to: process.env.GUIDE_EMAIL_REPLY_TO || undefined,
      }),
    });
    const body = await response.json().catch(() => ({})) as { id?: string; message?: string; error?: string };
    if (!response.ok) {
      return { sent: false, provider: 'resend', error: body.message || body.error || `Resend returned ${response.status}` };
    }
    return { sent: true, provider: 'resend', messageId: body.id };
  } catch (error) {
    return { sent: false, provider: 'resend', error: (error as Error).message };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}
