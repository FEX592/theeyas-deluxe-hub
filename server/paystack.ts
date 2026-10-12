import crypto from 'crypto';
import { db } from './db.ts';

export interface PaystackInitParams {
  email: string;
  amount_kobo: number;
  reference: string;
  callback_url: string;
  metadata?: Record<string, any>;
  subaccount_code?: string | null;
  split_code?: string | null;
}

export interface PaystackInitResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface PaystackVerifyResult {
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount_kobo: number;
  currency: string;
  paid_at?: string;
  gateway_response?: string;
  channel?: string;
}

export class PaystackService {
  private getSecretKey(): string | null {
    return process.env.PAYSTACK_SECRET_KEY || null;
  }

  private assertReference(reference: string): void {
    if (!/^TDH-ord-[A-Za-z0-9-]+-\d{10,}$/.test(reference)) {
      throw new Error('Invalid Paystack transaction reference.');
    }
  }

  async checkConnection(): Promise<{ active: boolean; message: string }> {
    const secretKey = this.getSecretKey();
    if (!secretKey) return { active: false, message: 'Paystack API key is not configured on the server.' };

    try {
      const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=1', {
        method: 'GET', headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(8000),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.status === true) return { active: true, message: 'Paystack API is reachable and accepted the server API key.' };
      if (response.status === 401 || response.status === 403) return { active: false, message: 'Paystack rejected the server API key. Check that it is valid.' };
      return { active: false, message: `Paystack responded, but the check failed (HTTP ${response.status}).` };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      return { active: false, message: timedOut ? 'The Paystack API check timed out. Try again.' : 'Could not connect to Paystack. Check the server connection and try again.' };
    }
  }

  async initializeTransaction(params: PaystackInitParams): Promise<PaystackInitResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) throw new Error('Paystack is not configured. A real Paystack secret key is required before accepting payments.');
    this.assertReference(params.reference);

    const providerConfig = db.getProviderConfig();
    const payload: Record<string, any> = {
      email: params.email, amount: params.amount_kobo, reference: params.reference,
      callback_url: params.callback_url, metadata: params.metadata || {},
    };
    if (params.split_code || providerConfig.split_code) payload.split_code = params.split_code || providerConfig.split_code;
    else if (params.subaccount_code || providerConfig.subaccount_code) {
      payload.subaccount = params.subaccount_code || providerConfig.subaccount_code;
      if (providerConfig.fee_bearer) payload.bearer = providerConfig.fee_bearer;
    }

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.status || !data.data?.authorization_url || !data.data?.access_code) {
        throw new Error(data?.message || `Paystack initialization failed (HTTP ${response.status}).`);
      }
      if (data.data.reference !== params.reference) throw new Error('Paystack returned a mismatched transaction reference.');
      return { authorization_url: data.data.authorization_url, access_code: data.data.access_code, reference: data.data.reference };
    } catch (err: any) {
      throw new Error(err?.message || 'Paystack initialization failed.');
    }
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResult> {
    const secretKey = this.getSecretKey();
    if (!secretKey) throw new Error('Paystack is not configured. Payment cannot be verified.');
    this.assertReference(reference);

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET', headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(10000),
      });
      const data = await response.json().catch(() => null);
      if (response.status >= 500 || !response.ok && response.status !== 400 && response.status !== 404) {
        throw new Error(`Paystack verification temporarily failed (HTTP ${response.status}).`);
      }
      if (!response.ok || !data?.status || !data.data) {
        return { status: 'failed', reference, amount_kobo: 0, currency: 'NGN', gateway_response: data?.message || 'Verification failed' };
      }
      const txData = data.data;
      const providerStatus = txData.status === 'success' ? 'success' : txData.status === 'failed' ? 'failed' : txData.status === 'abandoned' ? 'abandoned' : 'pending';
      return {
        status: providerStatus, reference: txData.reference, amount_kobo: txData.amount, currency: txData.currency,
        paid_at: txData.paid_at, gateway_response: txData.gateway_response, channel: txData.channel,
      };
    } catch (err: any) {
      throw new Error(err?.message || 'Paystack verification temporarily failed.');
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey || !signature) return false;
    try {
      const expected = crypto.createHmac('sha512', secretKey).update(rawBody, 'utf8').digest('hex');
      const expectedBuffer = Buffer.from(expected, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');
      return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch { return false; }
  }
}

export const paystack = new PaystackService();
