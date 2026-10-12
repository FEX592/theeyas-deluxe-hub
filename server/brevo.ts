import { db } from './db.ts';
import { Order } from './types.ts';

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  replyTo?: string;
  attachments?: Array<{ name: string; content: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderTemplate(
  templateHtml: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let output = templateHtml;
  for (const [key, val] of Object.entries(variables)) {
    const rawVal = val != null ? String(val) : '';
    // If it's a URL or formatted text, don't double escape safe links, but escape raw strings
    const safeVal = key.endsWith('_url') ? rawVal : escapeHtml(rawVal);
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    output = output.replace(regex, safeVal);
  }
  return output;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildReceiptPdf(order: Order): string {
  const lines = [
    "THEEYA'S DELUXE HUB — PAYMENT RECEIPT",
    `Order: ${order.order_number}`,
    `Customer: ${order.customer_name}`,
    `Email: ${order.customer_email}`,
    `WhatsApp: ${order.whatsapp_number}`,
    `Listing: ${order.listing_snapshot.name}`,
    `Amount paid: ${order.currency} ${(order.amount_kobo / 100).toLocaleString('en-NG')}`,
    `Payment status: ${order.payment_status.toUpperCase()}`,
    `Order status: ${order.order_status.replace('_', ' ').toUpperCase()}`,
    `Paid at: ${order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : 'Pending'}`,
  ];
  const text = lines.map((line, index) => `BT /F1 ${index === 0 ? 18 : 12} Tf 72 ${740 - index * 42} Td (${escapePdfText(line)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(text, 'latin1')} >>\nstream\n${text}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1').toString('base64');
}

export class BrevoService {
  private getApiKey(): string | null {
    return process.env.BREVO_API_KEY || null;
  }

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = this.getApiKey();
    const settings = db.getSettings();

    const senderEmail = settings.brevo_sender_email || 'noreply@theeyasdeluxehub.com';
    const senderName = settings.brevo_sender_name || "Theeya's Deluxe Hub";
    const replyToEmail = params.replyTo || settings.brevo_reply_to || settings.support_email;

    if (!apiKey) {
      console.log(`[Brevo] API key not configured. Mocking email delivery to ${params.to}: "${params.subject}"`);
      return {
        success: true,
        messageId: `mock-brevo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        simulated: true,
      };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [
            {
              email: params.to,
              name: params.toName || params.to.split('@')[0],
            },
          ],
          subject: params.subject,
          htmlContent: params.htmlContent,
          ...(params.attachments?.length ? { attachment: params.attachments } : {}),
          replyTo: {
            email: replyToEmail,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Brevo HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error reaching Brevo API',
      };
    }
  }
}

export const brevo = new BrevoService();
