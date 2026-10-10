import { db } from './db.ts';

export interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  replyTo?: string;
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
