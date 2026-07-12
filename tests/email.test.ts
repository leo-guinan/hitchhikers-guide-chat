import { describe, expect, it } from 'vitest';
import { sendSignInCodeEmail } from '../src/domain/email';

describe('email delivery', () => {
  it('reports not_configured when Resend env is absent', async () => {
    const oldKey = process.env.RESEND_API_KEY;
    const oldFrom = process.env.GUIDE_EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.GUIDE_EMAIL_FROM;
    try {
      const result = await sendSignInCodeEmail({ email: 'test@example.com', code: '123456', expiresAt: new Date(Date.now() + 60_000).toISOString() });
      expect(result.sent).toBe(false);
      expect(result.provider).toBe('not_configured');
      expect(result.error).toContain('RESEND_API_KEY');
    } finally {
      if (oldKey === undefined) delete process.env.RESEND_API_KEY;
      else process.env.RESEND_API_KEY = oldKey;
      if (oldFrom === undefined) delete process.env.GUIDE_EMAIL_FROM;
      else process.env.GUIDE_EMAIL_FROM = oldFrom;
    }
  });
});
