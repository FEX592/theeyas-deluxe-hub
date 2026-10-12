import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const reference = 'TDH-ord-ab12cd34-1730000000000';
const originalFetch = globalThis.fetch;
const originalSecret = process.env.PAYSTACK_SECRET_KEY;

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function service() {
  return (await import('../server/paystack.ts?payment-test=' + Math.random())).PaystackService;
}

async function amountMatcher() {
  return (await import('../server/paystack.ts?payment-test=' + Math.random())).matchesExpectedAmount;
}

beforeEach(() => { process.env.PAYSTACK_SECRET_KEY = 'sk_test_for_unit_tests'; });
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = originalSecret;
});

test('rejects initialization when Paystack credentials are missing', async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  const PaystackService = await service();
  await assert.rejects(() => new PaystackService().initializeTransaction({
    email: 'buyer@example.com', amount_kobo: 125000, reference, callback_url: 'https://example.com/callback',
  }), /Paystack is not configured/);
});

test('does not fabricate a checkout URL when Paystack initialization fails', async () => {
  globalThis.fetch = async () => response({ status: false, message: 'provider unavailable' }, 503);
  const PaystackService = await service();
  await assert.rejects(() => new PaystackService().initializeTransaction({
    email: 'buyer@example.com', amount_kobo: 125000, reference, callback_url: 'https://example.com/callback',
  }), /provider unavailable/);
});

test('accepts only an exact real-provider verification response', async () => {
  globalThis.fetch = async () => response({ status: true, data: {
    status: 'success', reference, amount: 125000, currency: 'NGN', gateway_response: 'Successful',
  } });
  const PaystackService = await service();
  const result = await new PaystackService().verifyTransaction(reference);
  assert.deepEqual(result, {
    status: 'success', reference, amount_kobo: 125000, requested_amount_kobo: undefined, fees_kobo: undefined, currency: 'NGN',
    paid_at: undefined, gateway_response: 'Successful', channel: undefined,
  });
});

test('accepts Paystack fee-inclusive amount only when requested amount and provider fee reconcile exactly', async () => {
  globalThis.fetch = async () => response({ status: true, data: {
    status: 'success', reference, amount: 50762, requested_amount: 50000, fees: 762, currency: 'NGN',
  } });
  const PaystackService = await service();
  const verify = await new PaystackService().verifyTransaction(reference);
  const matchesExpectedAmount = await amountMatcher();

  assert.equal(verify.amount_kobo, 50762);
  assert.equal(verify.requested_amount_kobo, 50000);
  assert.equal(verify.fees_kobo, 762);
  assert.equal(matchesExpectedAmount(50000, verify), true);
  assert.equal(matchesExpectedAmount(50001, verify), false);
  assert.equal(matchesExpectedAmount(50000, { ...verify, fees_kobo: 761 }), false);
  assert.equal(matchesExpectedAmount(50000, { ...verify, requested_amount_kobo: 49238 }), false);
});

test('continues to accept an exact provider amount without a fee adjustment', async () => {
  const matchesExpectedAmount = await amountMatcher();
  assert.equal(matchesExpectedAmount(125000, {
    status: 'success', reference, amount_kobo: 125000, currency: 'NGN',
  }), true);
  assert.equal(matchesExpectedAmount(125000, {
    status: 'success', reference, amount_kobo: 124999, currency: 'NGN',
  }), false);
});

test('returns failed and pending provider states without treating them as paid', async () => {
  const PaystackService = await service();
  globalThis.fetch = async () => response({ status: true, data: { status: 'failed', reference, amount: 125000, currency: 'NGN' } });
  assert.equal((await new PaystackService().verifyTransaction(reference)).status, 'failed');
  globalThis.fetch = async () => response({ status: true, data: { status: 'pending', reference, amount: 125000, currency: 'NGN' } });
  assert.equal((await new PaystackService().verifyTransaction(reference)).status, 'pending');
});

test('rejects fabricated and malformed references before contacting Paystack', async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return response({ status: true }); };
  const PaystackService = await service();
  await assert.rejects(() => new PaystackService().verifyTransaction('test-fake-reference'), /Invalid Paystack transaction reference/);
  assert.equal(called, false);
});

test('requires the configured secret for webhook signatures and compares safely', async () => {
  const PaystackService = await service();
  const rawBody = JSON.stringify({ event: 'charge.success', data: { reference } });
  const crypto = await import('node:crypto');
  const signature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!).update(rawBody).digest('hex');
  const paystack = new PaystackService();
  assert.equal(paystack.verifyWebhookSignature(rawBody, signature), true);
  assert.equal(paystack.verifyWebhookSignature(rawBody, signature.slice(0, -1)), false);
  delete process.env.PAYSTACK_SECRET_KEY;
  assert.equal(paystack.verifyWebhookSignature(rawBody, signature), false);
});
