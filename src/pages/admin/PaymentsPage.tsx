import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { api } from '../../lib/api.ts';

type ApiStatus = 'checking' | 'active' | 'inactive';

export const PaymentsPage: React.FC = () => {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [message, setMessage] = useState('Checking the Paystack API…');
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const checkApi = useCallback(async () => {
    setStatus('checking');
    setMessage('Checking the Paystack API…');
    try {
      const result = await api.checkPaystackStatus();
      setStatus(result.active ? 'active' : 'inactive');
      setMessage(result.message);
      setCheckedAt(new Date().toLocaleString());
    } catch (error) {
      setStatus('inactive');
      setMessage(error instanceof Error ? error.message : 'Could not check the Paystack API. Try again.');
      setCheckedAt(new Date().toLocaleString());
    }
  }, []);

  useEffect(() => {
    void checkApi();
  }, [checkApi]);

  const statusLabel = status === 'checking' ? 'Checking' : status === 'active' ? 'API active' : 'API inactive';
  const statusColor = status === 'active'
    ? 'text-emerald-300 border-emerald-700/60 bg-emerald-950/50'
    : status === 'inactive'
      ? 'text-red-300 border-red-800/60 bg-red-950/40'
      : 'text-amber-200 border-amber-700/60 bg-amber-950/30';

  return (
    <AdminLayout title="Payment API Status" subtitle="Check whether the Paystack API is reachable and accepting the server key.">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-2xl border border-[#1F2637] bg-[#111622] p-6 shadow-xl sm:p-8" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-3">
                <Activity className="h-5 w-5 text-[#FACC15]" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-white">Paystack API connection</h2>
                <p className="mt-1 text-sm text-[#9CA3AF]">Live status from a secure server-side check.</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusColor}`}>
              {status === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : status === 'active' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {statusLabel}
            </span>
          </div>

          <div className="mt-6 rounded-xl border border-[#1E2638] bg-[#0B0F17] p-4">
            <p className={`text-sm ${status === 'active' ? 'text-emerald-200' : status === 'inactive' ? 'text-red-200' : 'text-[#D1D5DB]'}`}>
              {message}
            </p>
            {checkedAt && <p className="mt-2 text-xs text-[#6B7280]">Last checked: {checkedAt}</p>}
          </div>

          <button
            type="button"
            onClick={() => void checkApi()}
            disabled={status === 'checking'}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-3.5 text-sm font-bold text-black shadow-md transition hover:bg-[#EAB308] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {status === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {status === 'checking' ? 'Checking API…' : 'Check API again'}
          </button>

          <p className="mt-5 text-xs leading-5 text-[#6B7280]">
            This uses a read-only Paystack request. It does not create a payment or reveal the server key.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
};
