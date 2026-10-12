import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReceiptPdf, buildReceiptPng } from '../server/brevo.ts';
import type { Order } from '../server/types.ts';
import sharp from 'sharp';

const order: Order = {
  id: 'ord-receipt-test',
  order_number: 'TDH-123456',
  user_id: null,
  customer_name: 'Receipt Customer',
  customer_email: 'customer@example.com',
  whatsapp_number: '+2348000000000',
  listing_id: 'lst-test',
  listing_snapshot: { id: 'lst-test', name: 'Test Community', type: 'group', category_name: 'Business & Tech', price_ngn: 25000, fulfillment_mode: 'automatic' },
  amount_kobo: 2500000,
  currency: 'NGN',
  payment_status: 'paid',
  order_status: 'completed',
  tracking_token_hash: 'hash',
  created_at: '2026-10-12T03:00:00.000Z',
  updated_at: '2026-10-12T03:00:00.000Z',
  paid_at: '2026-10-12T03:01:00.000Z',
  completed_at: '2026-10-12T03:01:00.000Z',
};

test('builds a PDF receipt attachment with order recipient details', () => {
  const decoded = Buffer.from(buildReceiptPdf(order), 'base64').toString('latin1');
  assert.match(decoded, /^%PDF-1\.4/);
  assert.match(decoded, /TDH-123456/);
  assert.match(decoded, /Receipt Customer/);
  assert.match(decoded, /customer@example.com/);
  assert.match(decoded, /%%EOF$/);
});

test('builds a matching PNG receipt attachment', async () => {
  const png = Buffer.from(await buildReceiptPng(order), 'base64');
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, 612);
  assert.equal(metadata.height, 792);
});
