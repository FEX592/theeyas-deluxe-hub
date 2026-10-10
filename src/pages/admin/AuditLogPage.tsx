import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { AuditLogEntry } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Search, RefreshCw } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = () => {
    setLoading(true);
    api
      .getAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actor_email.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout
      title="Security & Operations Audit Log"
      subtitle="Immutable trail of administrative updates, role changes, and transaction verifications"
      actions={
        <button
          onClick={loadData}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-[#111622] border border-[#1F2637] hover:bg-[#161C2C] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" />
          <span>Refresh Audit</span>
        </button>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-4 shadow-xl flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search audit trail by actor, action or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#FACC15]"
            />
          </div>
        </div>

        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-[#F3F4F6]">
            <thead className="bg-[#0D111A] border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2637]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6B7280]">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6B7280]">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161C2C]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#FACC15]">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-white">{log.actor_email}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white">{log.entity_type}</span>{' '}
                      <span className="font-mono text-[11px] text-[#9CA3AF]">({log.entity_id})</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#9CA3AF] max-w-sm truncate">{log.details}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#6B7280] text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};
