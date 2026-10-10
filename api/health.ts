import { db } from '../server/db.ts';
import { isSupabaseConfigured } from '../server/supabase.ts';

export default function handler(_req: any, res: any) {
  const outbox = db.getEmailOutbox();
  const pending = outbox.filter((j) => j.status === 'queued' || j.status === 'retrying').length;
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    store: db.getSettings().store_name,
    brevo_configured: !!process.env.BREVO_API_KEY,
    paystack_configured: !!process.env.PAYSTACK_SECRET_KEY,
    supabase_configured: isSupabaseConfigured(),
    outbox_pending_jobs: pending,
    bootstrap_claimed: db.getBootstrapState().claimed,
  });
}
