import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { paystack } from './server/paystack.ts';
import { brevo, renderTemplate } from './server/brevo.ts';
import { outboxWorker } from './server/outbox-worker.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Capture raw body for webhook verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Vercel Functions cannot host a durable interval worker. Run this worker only
// in the standalone Node server; use a durable queue/cron before production.
if (!process.env.VERCEL) outboxWorker.start(10000);

// Helper for admin auth header or session simulation
function getActorEmail(req: Request): string {
  const custom = req.headers['x-actor-email'] as string;
  if (custom) return custom;
  const bootstrap = db.getBootstrapState();
  if (bootstrap.owner_id) {
    const owner = db.getProfileById(bootstrap.owner_id);
    if (owner) return owner.email;
  }
  return 'admin@theeyasdeluxehub.com';
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Health & Config
app.get('/api/health', (_req: Request, res: Response) => {
  const outbox = db.getEmailOutbox();
  const pending = outbox.filter((j) => j.status === 'queued' || j.status === 'retrying').length;
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    store: db.getSettings().store_name,
    brevo_configured: !!process.env.BREVO_API_KEY,
    paystack_configured: !!process.env.PAYSTACK_SECRET_KEY,
    outbox_pending_jobs: pending,
    bootstrap_claimed: db.getBootstrapState().claimed,
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  const provider = db.getProviderConfig();
  res.json({
    store_name: settings.store_name,
    currency: settings.currency,
    support_email: settings.support_email,
    support_whatsapp: settings.support_whatsapp,
    paystack_environment: provider.environment,
    bootstrap_claimed: db.getBootstrapState().claimed,
  });
});

// 2. Owner Bootstrap & Auth
app.get('/api/admin/bootstrap-status', (_req: Request, res: Response) => {
  res.json(db.getBootstrapState());
});

app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
  try {
    const { email, displayName, secret } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Owner email address is required' });
    }

    // Optional environment secret verification if configured
    const expectedSecret = process.env.TDH_OWNER_BOOTSTRAP_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid owner bootstrap secret' });
    }

    const profile = db.claimBootstrap(email, displayName || 'Store Owner');
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  let profile = db.getProfileByEmail(email);
  if (!profile) {
    // If bootstrap not claimed yet, suggest bootstrap
    const bState = db.getBootstrapState();
    if (!bState.claimed) {
      return res.status(400).json({ error: 'Initial owner bootstrap has not been completed. Go to /setup/owner' });
    }
    // Create customer profile
    profile = db.createOrUpdateCustomer(email, email.split('@')[0]);
  }

  res.json({ success: true, profile });
});

app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { email, displayName } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const bState = db.getBootstrapState();
  if (!bState.claimed) {
    return res.status(403).json({ error: 'Registration is closed until owner setup is complete.' });
  }

  const existing = db.getProfileByEmail(email);
  if (existing) {
    return res.json({ success: true, profile: existing });
  }

  const profile = db.createOrUpdateCustomer(email, displayName || email.split('@')[0]);
  res.json({ success: true, profile });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const email = (req.query.email as string) || (req.headers['x-actor-email'] as string);
  if (!email) {
    // If no email, check if owner exists
    const bState = db.getBootstrapState();
    if (bState.owner_id) {
      const owner = db.getProfileById(bState.owner_id);
      return res.json({ profile: owner });
    }
    return res.json({ profile: null });
  }

  const profile = db.getProfileByEmail(email);
  res.json({ profile: profile || null });
});

// 3. Categories (Public & Admin)
app.get('/api/categories', (_req: Request, res: Response) => {
  res.json(db.getCategories().filter((c) => c.active));
});

app.get('/api/admin/categories', (_req: Request, res: Response) => {
  res.json(db.getCategories());
});

app.post('/api/admin/categories', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const category = db.saveCategory(req.body, actorEmail);
    res.json(category);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/categories/:id', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    db.deleteCategory(req.params.id, actorEmail);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Listings
// Public listings (CRITICAL: NEVER exposes private_links)
app.get('/api/listings', (_req: Request, res: Response) => {
  res.json(db.getPublicListings());
});

app.get('/api/listings/:idOrSlug', (req: Request, res: Response) => {
  const param = req.params.idOrSlug;
  const listing = db.getListingBySlug(param) || db.getListingById(param);
  if (!listing || listing.status !== 'published') {
    return res.status(404).json({ error: 'Listing not found or unavailable' });
  }
  res.json(listing);
});

// Admin Listings (Includes drafts and private link details)
app.get('/api/admin/listings', (_req: Request, res: Response) => {
  const listings = db.getAllListings();
  const withLinks = listings.map((l) => {
    const link = db.getListingPrivateLink(l.id);
    return {
      ...l,
      internal_source_url: link?.internal_source_url || '',
      customer_access_url: link?.customer_access_url || '',
    };
  });
  res.json(withLinks);
});

app.get('/api/admin/listings/:id', (req: Request, res: Response) => {
  const listing = db.getListingById(req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const link = db.getListingPrivateLink(listing.id);
  res.json({
    ...listing,
    internal_source_url: link?.internal_source_url || '',
    customer_access_url: link?.customer_access_url || '',
  });
});

app.post('/api/admin/listings', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const { internal_source_url, customer_access_url, ...listingData } = req.body;
    const listing = db.saveListing(
      listingData,
      { internal_source_url, customer_access_url },
      actorEmail
    );
    res.json(listing);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/listings/:id', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    db.deleteListing(req.params.id, actorEmail);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Smart WhatsApp Import Endpoint
app.post('/api/admin/listings/smart-import', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'A valid WhatsApp link is required' });
  }

  const cleanUrl = url.trim();
  const isGroup = cleanUrl.includes('chat.whatsapp.com');
  const isChannel = cleanUrl.includes('whatsapp.com/channel');

  if (!isGroup && !isChannel) {
    return res.status(400).json({
      error: 'Unrecognized WhatsApp link format. Expected chat.whatsapp.com/... or whatsapp.com/channel/...',
    });
  }

  // Derive slug candidate safely without fabricating information
  const code = cleanUrl.split('/').pop() || 'whatsapp-community';
  const type = isGroup ? 'group' : 'channel';

  // Factual, transparent metadata response with confidence state
  res.json({
    success: true,
    type,
    source_url: cleanUrl,
    extracted_fields: {
      type: { value: type, source: 'url_path', confidence: 'high' },
      internal_source_url: { value: cleanUrl, source: 'input', confidence: 'high' },
      customer_access_url: { value: cleanUrl, source: 'input', confidence: 'high' },
    },
    missing_fields: ['name', 'description', 'category_id', 'price_ngn'],
    notes: 'Public WhatsApp invitation links do not expose full server titles via open scraping. Please review and complete the listing details.',
  });
});

// 5. Payments & Checkout
app.post('/api/payments/initialize', async (req: Request, res: Response) => {
  try {
    const { listing_id, customer_name, customer_email, whatsapp_number, user_id } = req.body;

    if (!listing_id || !customer_name || !customer_email || !whatsapp_number) {
      return res.status(400).json({ error: 'All checkout fields (name, email, WhatsApp number) are required' });
    }

    const listing = db.getListingById(listing_id);
    if (!listing || listing.status !== 'published') {
      return res.status(400).json({ error: 'Listing is not available for purchase' });
    }

    // 1. Create order in pending_payment state
    const { order, tracking_token } = db.createOrder({
      listing,
      customer_name,
      customer_email,
      whatsapp_number,
      user_id,
    });

    // 2. Build unique payment reference
    const reference = `TDH-${order.id}-${Date.now()}`;
    const settings = db.getSettings();
    const callbackUrl = `${settings.canonical_url}/order-confirmation/${order.id}`;

    // 3. Initialize Paystack transaction
    const paystackResult = await paystack.initializeTransaction({
      email: customer_email,
      amount_kobo: order.amount_kobo,
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        listing_name: listing.name,
      },
    });

    // 4. Record payment transaction record
    db.recordTransaction({
      order_id: order.id,
      provider: 'paystack',
      environment: paystackResult.simulated ? 'test' : 'live',
      reference,
      provider_reference: paystackResult.access_code,
      amount_kobo: order.amount_kobo,
      currency: order.currency,
      status: 'pending',
      failure_reason: null,
      subaccount_code: null,
      split_code: null,
      verified_at: null,
    });

    // 5. Enqueue order.created and admin.order_created transactional emails
    outboxWorker.enqueueOrderEvent('order.created', order);
    outboxWorker.enqueueOrderEvent('admin.order_created', order);

    res.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      tracking_token,
      authorization_url: paystackResult.authorization_url,
      reference,
      simulated: paystackResult.simulated,
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message || 'Payment initialization failed' });
  }
});

app.get('/api/payments/verify', async (req: Request, res: Response) => {
  try {
    const reference = req.query.reference as string;
    if (!reference) return res.status(400).json({ error: 'Transaction reference is required' });

    const tx = db.getTransactionByReference(reference);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    const verifyResult = await paystack.verifyTransaction(reference);

    if (verifyResult.status === 'success') {
      // Mark order paid, and auto-fulfill if automatic listing
      const { order, autoFulfilled } = db.markOrderPaid(tx.order_id, reference);

      // Enqueue payment confirmed receipt email
      outboxWorker.enqueueOrderEvent('payment.confirmed', order);

      // If automatically fulfilled, enqueue access delivery email immediately
      if (autoFulfilled) {
        const fulfillment = db.getOrderFulfillment(order.id);
        outboxWorker.enqueueOrderEvent('order.completed', order, fulfillment);
      }

      return res.json({
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        payment_status: order.payment_status,
        order_status: order.order_status,
        auto_fulfilled: autoFulfilled,
      });
    } else {
      const order = db.getOrderById(tx.order_id);
      if (order && order.payment_status !== 'paid') {
        outboxWorker.enqueueOrderEvent('payment.failed', order);
      }
      return res.json({
        success: false,
        status: verifyResult.status,
        message: verifyResult.gateway_response || 'Payment was not confirmed',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Paystack Signed Webhook Handler
app.post('/api/payments/webhooks/paystack', (req: any, res: Response) => {
  const signature = req.headers['x-paystack-signature'] as string;
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!signature || !paystack.verifyWebhookSignature(rawBody, signature)) {
    console.warn('[Webhook] Invalid Paystack signature received');
    return res.status(400).send('Invalid signature');
  }

  const event = req.body;
  if (event.event === 'charge.success') {
    const data = event.data;
    const reference = data.reference;
    const tx = db.getTransactionByReference(reference);
    if (tx) {
      const { order, autoFulfilled } = db.markOrderPaid(tx.order_id, reference);
      outboxWorker.enqueueOrderEvent('payment.confirmed', order);
      if (autoFulfilled) {
        const fulfillment = db.getOrderFulfillment(order.id);
        outboxWorker.enqueueOrderEvent('order.completed', order, fulfillment);
      }
    }
  }

  res.status(200).json({ received: true });
});

// Payment Provider Settings
app.get('/api/payments/providers', (_req: Request, res: Response) => {
  const config = db.getProviderConfig();
  res.json({
    installed: [
      {
        key: 'paystack',
        name: 'Paystack',
        enabled: config.enabled,
        environment: config.environment,
        subaccount_code: config.subaccount_code,
        split_code: config.split_code,
        fee_bearer: config.fee_bearer,
        has_secret: config.has_secret,
        last_tested_at: config.last_tested_at,
        capabilities: ['cards', 'bank_transfer', 'ussd', 'qr', 'split_payments', 'subaccounts'],
      },
    ],
  });
});

app.post('/api/admin/payments/settings', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const updated = db.updateProviderConfig(req.body, actorEmail);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Orders & Tracking
app.get('/api/orders/track', (req: Request, res: Response) => {
  const orderId = req.query.orderId as string;
  const identifier = req.query.identifier as string; // email or tracking token

  if (!orderId || !identifier) {
    return res.status(400).json({ error: 'Order ID and verification factor (email or tracking token) are required' });
  }

  const order = db.verifyOrderTracking(orderId, identifier);
  if (!order) {
    return res.status(404).json({ error: 'Order not found with provided credentials' });
  }

  const fulfillment = order.order_status === 'completed' ? db.getOrderFulfillment(order.id) : null;

  res.json({
    order: {
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      listing_snapshot: order.listing_snapshot,
      amount_kobo: order.amount_kobo,
      currency: order.currency,
      payment_status: order.payment_status,
      order_status: order.order_status,
      created_at: order.created_at,
      paid_at: order.paid_at,
      completed_at: order.completed_at,
    },
    fulfillment: fulfillment ? { access_url: fulfillment.access_url, fulfilled_at: fulfillment.fulfilled_at } : null,
  });
});

app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const fulfillment = order.order_status === 'completed' ? db.getOrderFulfillment(order.id) : null;

  res.json({
    order,
    fulfillment: fulfillment ? { access_url: fulfillment.access_url, fulfilled_at: fulfillment.fulfilled_at } : null,
  });
});

app.get('/api/admin/orders', (_req: Request, res: Response) => {
  const orders = db.getAllOrders();
  res.json(orders);
});

app.get('/api/admin/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const fulfillment = db.getOrderFulfillment(order.id);
  const transactions = db.getAllTransactions().filter((t) => t.order_id === order.id);
  const emailLogs = db.getEmailLogs().filter((l) => l.order_id === order.id);

  res.json({
    order,
    fulfillment,
    transactions,
    email_logs: emailLogs,
  });
});

// Admin Manual Fulfillment Completion
app.post('/api/admin/orders/:id/fulfill', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const { access_url, notes } = req.body;
    const order = db.completeOrderManualFulfillment(req.params.id, access_url, actorEmail, notes);
    const fulfillment = db.getOrderFulfillment(order.id);

    // Enqueue access delivery email
    outboxWorker.enqueueOrderEvent('order.completed', order, fulfillment);

    res.json({ success: true, order, fulfillment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/orders/:id/resend-access', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const order = db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.order_status !== 'completed') {
      return res.status(400).json({ error: 'Order is not completed yet.' });
    }
    const fulfillment = db.getOrderFulfillment(order.id);
    if (!fulfillment) return res.status(400).json({ error: 'No fulfillment record found.' });

    outboxWorker.enqueueOrderEvent('order.completed', order, fulfillment);
    db.addAuditLog(actorEmail, 'order.access_resent', 'order', order.id, `Access email resent to ${order.customer_email}`);

    res.json({ success: true, message: 'Access invitation email re-queued successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Email Automation & HTML-Source-Only Template Editor
app.get('/api/admin/emails/templates', (_req: Request, res: Response) => {
  res.json(db.getEmailTemplates());
});

app.get('/api/admin/emails/templates/:id', (req: Request, res: Response) => {
  const template = db.getEmailTemplateById(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
});

// Save Draft (HTML source only)
app.post('/api/admin/emails/templates/:id', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const template = db.saveEmailTemplate(req.params.id, req.body, actorEmail);
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Publish Template
app.post('/api/admin/emails/templates/:id/publish', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const template = db.publishEmailTemplate(req.params.id, actorEmail);
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Rollback Template to Published Version
app.post('/api/admin/emails/templates/:id/rollback', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const template = db.rollbackEmailTemplate(req.params.id, actorEmail);
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Test Email Send
app.post('/api/admin/emails/test', async (req: Request, res: Response) => {
  try {
    const { template_id, recipient_email, variables } = req.body;
    if (!recipient_email) return res.status(400).json({ error: 'Recipient test email is required' });

    const template = db.getEmailTemplateById(template_id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const testVars = {
      customer_name: 'Test Customer',
      customer_email: recipient_email,
      whatsapp_number: '+2348012345678',
      order_id: 'TDH-TEST-999',
      listing_name: 'West Africa Founders & Angel Syndicate',
      listing_type: 'WhatsApp Group',
      listing_category: 'Business & Tech',
      amount: '25,000',
      currency: 'NGN',
      payment_status: 'PAID',
      order_status: 'COMPLETED',
      payment_reference: 'TDH-REF-TEST-1234',
      paid_at: new Date().toLocaleString('en-GB'),
      created_at: new Date().toLocaleString('en-GB'),
      tracking_url: `${db.getSettings().canonical_url}/track-order?orderId=TDH-TEST-999`,
      order_url: `${db.getSettings().canonical_url}/orders/test`,
      access_url: 'https://chat.whatsapp.com/TestInvitationSampleOnly',
      support_email: db.getSettings().support_email,
      site_url: db.getSettings().canonical_url,
      ...variables,
    };

    const renderedHtml = renderTemplate(template.html_source, testVars);
    const renderedSubject = renderTemplate(template.subject, testVars) + ' [TEST SEND]';

    const result = await brevo.sendEmail({
      to: recipient_email,
      subject: renderedSubject,
      htmlContent: renderedHtml,
    });

    db.recordEmailLog({
      outbox_id: 'test-' + Date.now(),
      event_key: 'test.send',
      recipient: recipient_email,
      order_id: null,
      template_name: template.name + ' (Test Send)',
      status: result.success ? (result.simulated ? 'sent (simulated)' : 'sent') : 'failed',
      brevo_message_id: result.messageId || null,
      error_message: result.error || null,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Outbox and Logs
app.get('/api/admin/emails/outbox', (_req: Request, res: Response) => {
  res.json(db.getEmailOutbox());
});

app.post('/api/admin/emails/process-outbox', async (_req: Request, res: Response) => {
  const result = await outboxWorker.processQueue(20);
  res.json(result);
});

app.get('/api/admin/emails/logs', (req: Request, res: Response) => {
  const { event_key, status, query } = req.query;
  let logs = db.getEmailLogs();

  if (event_key) logs = logs.filter((l) => l.event_key === event_key);
  if (status) logs = logs.filter((l) => l.status.toLowerCase().includes((status as string).toLowerCase()));
  if (query) {
    const q = (query as string).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.recipient.toLowerCase().includes(q) ||
        (l.order_id && l.order_id.toLowerCase().includes(q)) ||
        l.template_name.toLowerCase().includes(q)
    );
  }

  res.json(logs);
});

app.post('/api/admin/emails/retry/:jobId', (req: Request, res: Response) => {
  const job = db.getEmailOutbox().find((j) => j.id === req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Outbox job not found' });

  db.updateEmailJob(job.id, {
    status: 'queued',
    next_retry_at: new Date().toISOString(),
    attempts: Math.max(0, job.attempts - 1),
  });

  outboxWorker.processQueue(5);
  res.json({ success: true, message: 'Job re-queued for immediate dispatch' });
});

// 8. Admin Management & Invites
app.get('/api/admin/admins', (_req: Request, res: Response) => {
  const profiles = db.getAllProfiles().filter((p) => p.role === 'admin' || p.role === 'owner');
  const invites = db.getAdminInvites();
  res.json({ profiles, invites });
});

app.post('/api/admin/admins/invite', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required for invitation' });
    const { invite, token } = db.createAdminInvite(email, actorEmail);
    res.json({ invite, token, link: `/admin/invite/${token}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/admins/revoke-invite', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    db.revokeAdminInvite(req.body.invite_id, actorEmail);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/invite/redeem', (req: Request, res: Response) => {
  try {
    const { token, email, displayName } = req.body;
    if (!token || !email) return res.status(400).json({ error: 'Token and email are required' });
    const profile = db.redeemAdminInvite(token, email, displayName);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Audit Logs & Settings
app.get('/api/admin/audit-log', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

app.get('/api/admin/settings', (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.post('/api/admin/settings', (req: Request, res: Response) => {
  try {
    const actorEmail = getActorEmail(req);
    const updated = db.updateSettings(req.body, actorEmail);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// VITE SPA MIDDLEWARE / STATIC ASSETS
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TDH Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) startServer();

export default app;
