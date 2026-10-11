import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { EmailLogEntry } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Search, RefreshCw, RotateCcw } from 'lucide-react';

export const EmailLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    api
      .getEmailLogs({ query, status: statusFilter })
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleRetry = async (outboxId: string) => {
    setRetryingId(outboxId);
    try {
      await api.retryEmailJob(outboxId);
      alert('Email job re-queued for immediate dispatch!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <AdminLayout
      title="Transactional Email Logs"
      subtitle="Complete delivery history, Brevo message IDs, and failure diagnostics"
      actions={
        <button
          onClick={loadData}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#111622] border border-[#1F2637] hover:bg-[#161C2C] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
          <span>Refresh Logs</span>
        </button>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Search & Filter Bar */}
        <form
          onSubmit={handleSearch}
          className="bg-[#111622] rounded-2xl border border-[#1F2637] p-4 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by recipient email or template..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#FACC15]"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl font-medium text-white focus:outline-none focus:border-[#FACC15]"
            >
              <option value="">All Delivery Statuses</option>
              <option value="sent">Sent / Delivered</option>
              <option value="failed">Failed / Retrying</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl cursor-pointer transition-all shadow-md"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Logs Table */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#F3F4F6]">
              <thead className="bg-[#0D111A] border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Event Trigger</th>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Brevo Message ID / Error</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2637]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                      Loading delivery logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                      No email log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isSuccess = log.status.toLowerCase().includes('sent');
                    return (
                      <tr key={log.id} className="hover:bg-[#161C2C]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#FACC15]">
                          {log.event_key}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{log.template_name}</td>
                        <td className="py-3 px-4 font-mono text-[#9CA3AF]">{log.recipient}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              isSuccess
                                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                                : 'bg-red-950/60 border-red-800 text-red-300'
                            }`}
                          >
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] max-w-xs truncate">
                          {log.brevo_message_id ? (
                            <span className="text-emerald-400">{log.brevo_message_id}</span>
                          ) : (
                            <span className="text-red-400">{log.error_message || 'N/A'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isSuccess && log.outbox_id && (
                            <button
                              onClick={() => handleRetry(log.outbox_id)}
                              disabled={retryingId === log.outbox_id}
                              className="px-2.5 py-1 text-[11px] font-semibold text-[#FACC15] hover:bg-[#161C2C] border border-[#1E2638] rounded-lg cursor-pointer inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{retryingId === log.outbox_id ? 'Retrying...' : 'Retry'}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
