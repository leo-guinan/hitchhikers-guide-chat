import type { CheckoutRequest } from './schema';

export const stripePriceId = process.env.STRIPE_PRICE_ID ?? 'price_1Ts6ceGzXpChNrVvnNrQ44Ms';

export type CheckoutResult = {
  configured: boolean;
  priceId: string;
  url?: string;
  id?: string;
  error?: string;
};

export async function createCheckoutSession(request: CheckoutRequest): Promise<CheckoutResult> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return {
      configured: false,
      priceId: stripePriceId,
      error: 'STRIPE_SECRET_KEY is not configured. Add it server-side to create live Checkout Sessions.',
    };
  }

  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('line_items[0][price]', stripePriceId);
  body.set('line_items[0][quantity]', '1');
  body.set('success_url', request.successUrl);
  body.set('cancel_url', request.cancelUrl);
  body.set('client_reference_id', request.sessionId);
  body.set('metadata[guide_session_id]', request.sessionId);
  if (request.email) {
    body.set('customer_email', request.email);
    body.set('metadata[account_email]', request.email);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json() as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !data.url) {
    return {
      configured: true,
      priceId: stripePriceId,
      error: data.error?.message ?? `Stripe Checkout failed with HTTP ${response.status}`,
    };
  }

  return {
    configured: true,
    priceId: stripePriceId,
    id: data.id,
    url: data.url,
  };
}
