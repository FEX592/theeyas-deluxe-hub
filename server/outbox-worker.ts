import { db } from './db.ts';
import { brevo, buildReceiptPdf, renderTemplate } from './brevo.ts';
import { Order, OrderFulfillment } from './types.ts';

export class OutboxWorker {
  private isRunning: boolean = false;
  private intervalTimer: NodeJS.Timeout | null = null;

  start(intervalMs = 15000): void {
    if (this.intervalTimer) return;
    this.intervalTimer = setInterval(() => {
      this.processQueue().catch((err) => console.error('Error processing email queue:', err));
    }, intervalMs);
    // Run an initial pass
    this.processQueue().catch((err) => console.error('Initial email queue pass error:', err));
  }

  stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  async processQueue(batchSize = 10): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isRunning) return { processed: 0, succeeded: 0, failed: 0 };
    this.isRunning = true;

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const now = new Date();
      const outbox = db.getEmailOutbox();
      const pendingJobs = outbox
        .filter(
          (j) =>
            j.status === 'queued' ||
            (j.status === 'retrying' && new Date(j.next_retry_at) <= now && j.attempts < j.max_attempts)
        )
        .slice(0, batchSize);

      for (const job of pendingJobs) {
        processed++;
        db.updateEmailJob(job.id, { status: 'processing', attempts: job.attempts + 1 });

        const orderForAttachment = job.event_key === 'payment.confirmed' && job.order_id
          ? db.getOrderById(job.order_id)
          : undefined;

        const result = await brevo.sendEmail({
          to: job.recipient,
          subject: job.rendered_subject,
          htmlContent: job.rendered_html,
          attachments: orderForAttachment
            ? [{ name: `${orderForAttachment.order_number}-receipt.pdf`, content: buildReceiptPdf(orderForAttachment) }]
            : undefined,
        });

        if (result.success) {
          succeeded++;
          db.updateEmailJob(job.id, {
            status: 'sent',
            sent_at: new Date().toISOString(),
            brevo_message_id: result.messageId || 'accepted-by-brevo',
            error_message: null,
          });

          const template = db.getEmailTemplateById(job.template_id);
          db.recordEmailLog({
            outbox_id: job.id,
            event_key: job.event_key,
            recipient: job.recipient,
            order_id: job.order_id,
            template_name: template?.name || job.event_key,
            status: result.simulated ? 'sent (simulated)' : 'sent',
            brevo_message_id: result.messageId || 'accepted-by-brevo',
            error_message: null,
          });
        } else {
          failed++;
          const newAttempts = job.attempts + 1;
          const willRetry = newAttempts < job.max_attempts;
          const backoffMinutes = Math.pow(2, newAttempts) * 2;
          const nextRetry = new Date(Date.now() + backoffMinutes * 60000).toISOString();

          db.updateEmailJob(job.id, {
            status: willRetry ? 'retrying' : 'failed',
            next_retry_at: nextRetry,
            error_message: result.error || 'Unknown Brevo error',
          });

          const template = db.getEmailTemplateById(job.template_id);
          db.recordEmailLog({
            outbox_id: job.id,
            event_key: job.event_key,
            recipient: job.recipient,
            order_id: job.order_id,
            template_name: template?.name || job.event_key,
            status: willRetry ? 'failed (retrying)' : 'failed (max attempts)',
            brevo_message_id: null,
            error_message: result.error || 'Delivery failed',
          });
        }
      }
    } finally {
      this.isRunning = false;
    }

    return { processed, succeeded, failed };
  }

  enqueueOrderEvent(
    eventKey: 'order.created' | 'payment.confirmed' | 'order.completed' | 'payment.failed' | 'admin.order_created',
    order: Order,
    fulfillment?: OrderFulfillment
  ): void {
    const template = db.getEmailTemplateByEvent(eventKey);
    if (!template || !template.enabled) {
      return;
    }

    const settings = db.getSettings();
    const siteUrl = settings.canonical_url;
    const trackingUrl = `${siteUrl}/track-order?orderId=${encodeURIComponent(order.order_number)}`;
    const orderUrl = `${siteUrl}/orders/${encodeURIComponent(order.id)}`;

    // Prepare variables per PRD
    const variables: Record<string, any> = {
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      whatsapp_number: order.whatsapp_number,
      order_id: order.order_number,
      listing_name: order.listing_snapshot.name,
      listing_type: order.listing_snapshot.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel',
      listing_category: order.listing_snapshot.category_name,
      amount: (order.amount_kobo / 100).toLocaleString('en-NG'),
      currency: order.currency,
      payment_status: order.payment_status.toUpperCase(),
      order_status: order.order_status.replace('_', ' ').toUpperCase(),
      payment_reference: 'TDH-TX-' + order.id.slice(-6).toUpperCase(),
      paid_at: order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : 'Pending',
      created_at: new Date(order.created_at).toLocaleString('en-GB'),
      tracking_url: trackingUrl,
      order_url: orderUrl,
      access_url: fulfillment ? fulfillment.access_url : '',
      support_email: settings.support_email,
      site_url: siteUrl,
    };

    // Use published HTML and subject if available
    const rawHtml = template.published_html || template.html_source;
    const rawSubject = template.published_subject || template.subject;

    const renderedHtml = renderTemplate(rawHtml, variables);
    const renderedSubject = renderTemplate(rawSubject, variables);

    const recipient =
      eventKey === 'admin.order_created' ? settings.support_email : order.customer_email;

    const idempotencyKey = `${order.id}-${eventKey}-${template.published_version || template.version}`;

    db.enqueueEmailJob({
      event_key: eventKey,
      order_id: order.id,
      recipient,
      template_id: template.id,
      template_version: template.published_version || template.version,
      rendered_subject: renderedSubject,
      rendered_html: renderedHtml,
      idempotency_key: idempotencyKey,
    });

    // Run outbox processor immediately in background
    setTimeout(() => {
      this.processQueue().catch((err) => console.error('Immediate email dispatch error:', err));
    }, 100);
  }
}

export const outboxWorker = new OutboxWorker();
