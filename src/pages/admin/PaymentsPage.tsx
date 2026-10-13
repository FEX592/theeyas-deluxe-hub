import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Loader2, RefreshCw, Save } from 'lucide-react';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { api } from '../../lib/api.ts';

type ApiStatus = 'checking' | 'active' | 'inactive';

export const PaymentsPage: React.FC = () => {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [message, setMessage] = useState('Checking the Paystack API…');
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [splitCode, setSplitCode] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSplit, setSavingSplit] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

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
    api.getPaymentProviders()
      .then(({ installed }) => {
        setSplitCode(installed.find((provider) => provider.key === 'paystack')?.split_code || '');
      })
      .catch((error) => {
        setSettingsError(error instanceof Error ? error.message : 'Could not load Paystack settings.');
      })
      .finally(() => setLoadingSettings(false));
  }, [checkApi]);

  const saveSplitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingSplit(true);
    setSettingsMessage(null);
    setSettingsError(null);
    try {
      const updated = await api.updatePaymentSettings({ split_code: splitCode.trim() });
      setSplitCode(updated.split_code || '');
      setSettingsMessage(updated.split_code ? 'Split code saved. New marketplace checkouts will use this split.' : 'Split code cleared.');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not save the split code.');
    } finally {
      setSavingSplit(false);
    }
  };

  const statusLabel = status === 'checking' ? 'Checking' : status === 'active' ? 'API active' : 'API inactive';
  const statusColor = status === 'active'
    ? 'text-emerald-300 border-emerald-700/60 bg-emerald-950/50'
    : status === 'inactive'
      ? 'text-red-300 border-red-800/60 bg-red-950/40'
      : 'text-amber-200 border-amber-700/60 bg-amber-950/30';

  return (
    <AdminLayout title="Payment API Status" subtitle="Check Paystack connectivity and configure the existing marketplace split.">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-2xl border border-[#1F2637] bg-[#111622] p-6 shadow-xl sm:p-8">
          <form onSubmit={saveSplitCode}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight text-white">Marketplace transaction split</h2>
                <p className="mt-1 text-sm text-[#9CA3AF]">Enter the existing split code from your Paystack Dashboard. This does not create or change the split or its allocations.</p>
              </div>
            </div>

            <label htmlFor="paystack-split-code" className="mt-6 block text-xs font-semibold text-[#D1D5DB]">Paystack split code</label>
            <input
              id="paystack-split-code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={120}
              value={splitCode}
              onChange={(event) => { setSplitCode(event.target.value); setSettingsMessage(null); setSettingsError(null); }}
              disabled={loadingSettings || savingSplit}
              placeholder="SPL_…"
              className="mt-2 w-full rounded-xl border border-[#2A3348] bg-[#0B0F17] px-4 py-3 text-sm font-mono text-white outline-none transition focus:border-[#FACC15] disabled:opacity-60"
              aria-describedby="paystack-split-help"
            />
            <p id="paystack-split-help" className="mt-2 text-xs leading-5 text-[#6B7280]">
              Saved server-side and used on new API-initialized marketplace checkouts. The split code must match the Paystack environment configured for this store. Leaving it blank disables split-code routing.
            </p>

            {settingsError && <p className="mt-4 rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200" role="alert">{settingsError}</p>}
            {settingsMessage && <p className="mt-4 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200" role="status">{settingsMessage}</p>}

            <button
              type="submit"
              disabled={loadingSettings || savingSplit}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] px-4 py-3.5 text-sm font-bold text-black shadow-md transition hover:bg-[#EAB308] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {savingSplit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {savingSplit ? 'Saving split code…' : 'Save split code'}
            </button>
          </form>
        </section>

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
