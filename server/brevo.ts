import { db } from './db.ts';
import { Order } from './types.ts';
import sharp from 'sharp';

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
  return value.replace(/[^\x20-\x7E]/g, '-').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function escapeXml(value: string): string {
  return String(value).replace(/[^\x20-\x7E]/g, '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildReceiptSvg(order: Order): string {
  const amount = `${order.currency} ${(order.amount_kobo / 100).toLocaleString('en-NG')}`;
  const paidAt = order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : 'Pending';
  const text = (value: string, x: number, y: number, size: number, fill: string, bold = false) => `<text x="${x}" y="${792 - y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="#${fill}">${escapeXml(value)}</text>`;
  const rect = (x: number, y: number, width: number, height: number, fill: string) => `<rect x="${x}" y="${792 - y - height}" width="${width}" height="${height}" fill="#${fill}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="612" height="792" viewBox="0 0 612 792">
  ${rect(0, 0, 612, 792, 'FCFAF6')}
  ${rect(0, 690, 612, 102, '3D183F')}${rect(0, 688, 612, 2, 'D6B36A')}
  ${text('TDH', 54, 740, 18, 'FFFFFF', true)}${text("THEEYA'S DELUXE HUB", 108, 744, 18, 'FFFFFF', true)}
  ${text('PAYMENT RECEIPT', 108, 716, 10, 'D6B36A', true)}${text(order.order_number, 455, 732, 11, 'FFFFFF', true)}${text('Issued receipt', 455, 714, 9, 'D9D0DC')}
  ${text('Thank you for your payment', 54, 645, 22, '211F23', true)}${text('Your payment has been verified and recorded successfully.', 54, 620, 11, '706873')}
  ${text('BILLED TO', 54, 574, 9, '7B2CBF', true)}${text(order.customer_name, 54, 550, 13, '211F23', true)}${text(order.customer_email, 54, 530, 10, '706873')}${text(`WhatsApp: ${order.whatsapp_number}`, 54, 512, 10, '706873')}
  ${text('ORDER DETAILS', 326, 574, 9, '7B2CBF', true)}${text(order.listing_snapshot.name, 326, 550, 11, '211F23', true)}${text(`Order date: ${new Date(order.created_at).toLocaleDateString('en-GB')}`, 326, 530, 10, '706873')}${text(`Paid at: ${paidAt}`, 326, 512, 10, '706873')}
  ${rect(54, 370, 504, 104, 'F6EEF7')}${text('PAYMENT SUMMARY', 76, 448, 9, '7B2CBF', true)}${text('Payment status', 76, 416, 10, '706873')}${text(order.payment_status.toUpperCase(), 76, 396, 12, '26845A', true)}${text('Order status', 270, 416, 10, '706873')}${text(order.order_status.replace('_', ' ').toUpperCase(), 270, 396, 12, '211F23', true)}${text('TOTAL PAID', 414, 432, 9, '706873', true)}${text(amount, 414, 400, 17, '3D183F', true)}
  ${text('PAYMENT REFERENCE', 54, 326, 9, '7B2CBF', true)}${text(`TDH-TX-${order.id.slice(-6).toUpperCase()}`, 54, 304, 11, '211F23', true)}
  ${text('This receipt confirms payment for the listed WhatsApp Group or Channel access.', 54, 242, 10, '706873')}${text('Keep this document for your records. Your access details are delivered separately by email.', 54, 224, 10, '706873')}
  ${rect(54, 92, 504, 1, 'D6B36A')}${text("THEEYA'S DELUXE HUB", 54, 68, 9, '3D183F', true)}${text('Support: contact us through the website support channel', 54, 50, 9, '706873')}
</svg>`;
}

export async function buildReceiptPng(order: Order): Promise<string> {
  return (await sharp(Buffer.from(buildReceiptSvg(order))).png().toBuffer()).toString('base64');
}

export function buildReceiptPdf(order: Order): string {
  const color = (hex: string) => {
    const values = hex.match(/[A-Fa-f0-9]{2}/g)!.map((value) => parseInt(value, 16) / 255);
    return `${values.map((value) => value.toFixed(3)).join(' ')} rg`;
  };
  const text = (value: string, x: number, y: number, size: number, hex: string, bold = false) =>
    `q ${color(hex)} BT /F${bold ? 2 : 1} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET Q`;
  const rect = (x: number, y: number, width: number, height: number, hex: string, stroke = false) =>
    `q ${color(hex)} ${x} ${y} ${width} ${height} re ${stroke ? 'S' : 'f'} Q`;
  const amount = `${order.currency} ${(order.amount_kobo / 100).toLocaleString('en-NG')}`;
  const paidAt = order.paid_at ? new Date(order.paid_at).toLocaleString('en-GB') : 'Pending';
  const content = [
    rect(0, 0, 612, 792, 'FCFAF6'),
    rect(0, 690, 612, 102, '3D183F'),
    rect(0, 688, 612, 2, 'D6B36A'),
    text('TDH', 54, 740, 18, 'FFFFFF', true),
    text("THEEYA'S DELUXE HUB", 108, 744, 18, 'FFFFFF', true),
    text('PAYMENT RECEIPT', 108, 716, 10, 'D6B36A', true),
    text(order.order_number, 455, 732, 11, 'FFFFFF', true),
    text('Issued receipt', 455, 714, 9, 'D9D0DC'),
    text('Thank you for your payment', 54, 645, 22, '211F23', true),
    text('Your payment has been verified and recorded successfully.', 54, 620, 11, '706873'),
    text('BILLED TO', 54, 574, 9, '7B2CBF', true),
    text(order.customer_name, 54, 550, 13, '211F23', true),
    text(order.customer_email, 54, 530, 10, '706873'),
    text(`WhatsApp: ${order.whatsapp_number}`, 54, 512, 10, '706873'),
    text('ORDER DETAILS', 326, 574, 9, '7B2CBF', true),
    text(order.listing_snapshot.name, 326, 550, 11, '211F23', true),
    text(`Order date: ${new Date(order.created_at).toLocaleDateString('en-GB')}`, 326, 530, 10, '706873'),
    text(`Paid at: ${paidAt}`, 326, 512, 10, '706873'),
    rect(54, 370, 504, 104, 'F6EEF7'),
    text('PAYMENT SUMMARY', 76, 448, 9, '7B2CBF', true),
    text('Payment status', 76, 416, 10, '706873'),
    text(order.payment_status.toUpperCase(), 76, 396, 12, '26845A', true),
    text('Order status', 270, 416, 10, '706873'),
    text(order.order_status.replace('_', ' ').toUpperCase(), 270, 396, 12, '211F23', true),
    text('TOTAL PAID', 414, 432, 9, '706873', true),
    text(amount, 414, 400, 17, '3D183F', true),
    text('PAYMENT REFERENCE', 54, 326, 9, '7B2CBF', true),
    text(`TDH-TX-${order.id.slice(-6).toUpperCase()}`, 54, 304, 11, '211F23', true),
    text('This receipt confirms payment for the listed WhatsApp Group or Channel access.', 54, 242, 10, '706873'),
    text('Keep this document for your records. Your access details are delivered separately by email.', 54, 224, 10, '706873'),
    rect(54, 92, 504, 1, 'D6B36A'),
    text('THEEYA\'S DELUXE HUB', 54, 68, 9, '3D183F', true),
    text('Support: contact us through the website support channel', 54, 50, 9, '706873'),
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
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
