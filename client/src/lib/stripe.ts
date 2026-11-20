import { loadStripe } from '@stripe/stripe-js';

const isProduction = import.meta.env.MODE === 'production';
const key = isProduction
  ? import.meta.env.VITE_STRIPE_PUBLIC_KEY_LIVE
  : (import.meta.env.VITE_STRIPE_PUBLIC_KEY_TEST ?? import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const isLiveKey = key?.startsWith('pk_live_');
const isTestKey = key?.startsWith('pk_test_');

if (!isLiveKey && !isTestKey) {
  throw new Error(`Invalid Stripe publishable key format. Key starts with: ${key?.substring(0, 7)}`);
}

const keyMode = isLiveKey ? 'LIVE' : 'TEST';
console.log(`✅ Using Stripe ${keyMode} keys (MODE=${import.meta.env.MODE})`);

export const stripePromise = loadStripe(key);
