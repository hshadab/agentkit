import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
let stripe = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

// Charge using Stripe test mode (or simulate if no key set)
export async function charge({ amountMinor, currency = 'usd', description = 'ACP demo charge' }) {
  if (!stripe) {
    return {
      provider: 'simulator',
      id: 'sim_' + Math.random().toString(36).slice(2),
      amount: amountMinor,
      currency,
      status: 'succeeded',
    };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountMinor,
    currency,
    description,
    payment_method_types: ['card'],
    confirm: true,
    payment_method: 'pm_card_visa',
  });
  return {
    provider: 'stripe',
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    client_secret: paymentIntent.client_secret,
  };
}

