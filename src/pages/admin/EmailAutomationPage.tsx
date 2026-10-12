import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { EmailOutboxJob, EmailTemplate } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { BrevoSenderSettings } from '../../components/BrevoSenderSettings.tsx';
import { Mail, RefreshCw, FileCode, ListOrdered, CheckCircle2, AlertTriangle, ArrowRight, Loader2, Trash2 } from 'lucide-react';

export const EmailAutomationPage: React.FC = () => {
  const [outbox, setOutbox] = useState<EmailOutboxJob[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getEmailOutbox(), api.getEmailTemplates()])
      .then(([jobs, tmpls]) => {
        setOutbox(jobs);
        setTemplates(tmpls);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessOutbox = async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const res = await api.processOutbox();
      setProcessResult(`Processed ${res.processed} jobs: ${res.succeeded} delivered, ${res.failed} retrying/failed.`);
      loadData();
    } catch (err: any) {
      setProcessResult(`Outbox run error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteJob = async (job: EmailOutboxJob) => {
    if (!window.confirm(`OWNER ACTION: permanently delete this ${job.event_key} email job for ${job.recipient}?`)) return;
    try {
      await api.deleteEmailJob(job.id);
      setOutbox((current) => current.filter((item) => item.id !== job.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete email job');
    }
  };

  const pendingCount = outbox.filter((j) => j.status === 'queued' || j.status === 'retrying').length;
  const sentCount = outbox.filter((j) => j.status === 'sent').length;
  const failedCount = outbox.filter((j) => j.status === 'failed').length;

  return (
    <AdminLayout
      title="Email Automation & Outbox"
      subtitle="Operational status of Brevo transactional delivery, verified sender parameters, and outbox queues"
      actions={
        <div className="flex items-center gap-2">
          <Link
            to="/admin/emails/templates"
            className="px-3 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white bg-[#111622] border border-[#1F2637] rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>HTML Templates</span>
          </Link>

          <Link
            to="/admin/emails/logs"
            className="px-3 py-2 text-xs font-semibold text-[#9CA3AF] hover:text-white bg-[#111622] border border-[#1F2637] rounded-lg transition-colors inline-flex items-center gap-1.5"
          >
            <ListOrdered className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>Delivery Logs</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Screenshot-Identical Brevo Sender Settings Component */}
        <BrevoSenderSettings />

        {/* Outbox Metrics & Batch Operations */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-lg text-white">Durable Outbox Queue</h2>
              <p className="text-xs text-[#9CA3AF]">
                Transactional messages awaiting delivery or retrying with bounded backoff.
              </p>
            </div>

            <button
              onClick={handleProcessOutbox}
              disabled={processing}
              className="px-4 py-2 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {processing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Draining queue...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-black" />
                  <span>Process Outbox Now</span>
                </>
              )}
            </button>
          </div>

          {processResult && (
            <div className="p-3 bg-purple-950/60 border border-purple-800 text-purple-200 text-xs rounded-xl">
              {processResult}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-[#111622] border border-[#1F2637] p-5 rounded-xl">
              <span className="text-xs text-[#9CA3AF] font-medium block">Queued / Retrying Jobs</span>
              <span className="font-display font-extrabold text-2xl text-white font-mono mt-1 block">
                {pendingCount}
              </span>
              <span className="text-[11px] text-[#6B7280] mt-1 block">Automatic scheduler polling</span>
            </div>

            <div className="bg-[#111622] border border-[#1F2637] p-5 rounded-xl">
              <span className="text-xs text-[#9CA3AF] font-medium block">Delivered Messages</span>
              <span className="font-display font-extrabold text-2xl text-[#10B981] font-mono mt-1 block">
                {sentCount}
              </span>
              <span className="text-[11px] text-[#6B7280] mt-1 block">Accepted by Brevo API</span>
            </div>

            <div className="bg-[#111622] border border-[#1F2637] p-5 rounded-xl">
              <span className="text-xs text-[#9CA3AF] font-medium block">Failed (Exhausted Attempts)</span>
              <span className="font-display font-extrabold text-2xl text-red-500 font-mono mt-1 block">
                {failedCount}
              </span>
              <span className="text-[11px] text-[#6B7280] mt-1 block">Available for manual retry</span>
            </div>
          </div>
        </div>

        {/* Recent Outbox Table */}
        <div className="bg-[#111622] border border-[#1F2637] rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#1F2637] bg-[#161C2C] flex items-center justify-between">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white">
              Recent Outbox Queue Items
            </h3>
            <Link to="/admin/emails/logs" className="text-xs text-[#FACC15] hover:underline font-semibold">
              View All Logs →
            </Link>
          </div>

          <div className="divide-y divide-[#1F2637] text-xs">
            {outbox.length === 0 ? (
              <p className="p-6 text-center text-[#6B7280]">Outbox is currently clear. No pending jobs.</p>
            ) : (
              outbox.slice(0, 6).map((job) => (
                <div key={job.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#161C2C]/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{job.event_key}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          job.status === 'sent'
                            ? 'bg-emerald-950 text-[#10B981] border border-emerald-800'
                            : job.status === 'failed'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-amber-950 text-[#FACC15] border border-amber-800'
                        }`}
                      >
                        {job.status.toUpperCase()} (Attempt {job.attempts}/{job.max_attempts})
                      </span>
                    </div>
                    <span className="text-[11px] text-[#9CA3AF] block mt-0.5">
                      To: {job.recipient} · {job.rendered_subject}
                    </span>
                    {job.error_message && (
                      <span className="text-[11px] text-red-400 font-mono block mt-0.5">
                        Error: {job.error_message}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-[#6B7280] font-mono">
                      {new Date(job.created_at).toLocaleTimeString()}
                    </span>
                    <button onClick={() => handleDeleteJob(job)} className="p-1.5 text-red-400 hover:bg-red-950/50 rounded" title="Owner: permanently delete email job">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
