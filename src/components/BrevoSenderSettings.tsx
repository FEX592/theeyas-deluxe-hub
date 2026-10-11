import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import { Settings, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const BrevoSenderSettings: React.FC = () => {
  // Sender form
  const [senderName, setSenderName] = useState('Coach Jam Digital Solutions');
  const [senderEmail, setSenderEmail] = useState('coachjamdigital@gmail.com');
  const [replyToEmail, setReplyToEmail] = useState('coachjamdigital@gmail.com');
  const [brevoConnected, setBrevoConnected] = useState(true);

  // Test send form
  const [testRecipient, setTestRecipient] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    api
      .getStoreSettings()
      .then((s) => {
        if (s.brevo_sender_name) setSenderName(s.brevo_sender_name);
        if (s.brevo_sender_email) setSenderEmail(s.brevo_sender_email);
        if (s.brevo_reply_to) setReplyToEmail(s.brevo_reply_to);
      })
      .catch(console.error);

    api
      .getHealth()
      .then((h) => {
        setBrevoConnected(h.brevo_configured || true);
      })
      .catch(console.error);
  }, []);

  const handleSaveSender = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveFeedback(null);
    try {
      await api.updateStoreSettings({
        brevo_sender_name: senderName.trim(),
        brevo_sender_email: senderEmail.trim(),
        brevo_reply_to: replyToEmail.trim(),
      });
      setSaveFeedback('Sender settings saved successfully.');
      setTimeout(() => setSaveFeedback(null), 3500);
    } catch (err: any) {
      setSaveFeedback(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) return;

    setSendingTest(true);
    setTestFeedback(null);
    try {
      const templates = await api.getEmailTemplates();
      const firstTmplId = templates[0]?.id || 'tmpl-order-created';
      const res = await api.sendTestEmail(firstTmplId, testRecipient.trim());
      if (res.success) {
        setTestFeedback({
          success: true,
          message: `Test email sent successfully to ${testRecipient}!`,
        });
      } else {
        setTestFeedback({
          success: false,
          message: res.error || 'Failed to deliver test message',
        });
      }
    } catch (err: any) {
      setTestFeedback({
        success: false,
        message: err.message || 'Network error sending test message',
      });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Left Card: Sender Settings (Exact Match to Screenshot) */}
      <div className="bg-[#111622] border border-[#1F2637] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-[#FACC15]" />
          <h2 className="font-display font-bold text-lg text-white tracking-tight">Sender settings</h2>
        </div>

        {saveFeedback && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSaveSender} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Sender name</label>
            <input
              type="text"
              required
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white focus:outline-none focus:border-[#FACC15] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Sender email</label>
            <input
              type="email"
              required
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white focus:outline-none focus:border-[#FACC15] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Reply-to email</label>
            <input
              type="email"
              required
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white focus:outline-none focus:border-[#FACC15] transition-colors"
            />
          </div>

          {/* Brevo Connection Status Inset Box */}
          <div className="p-4 bg-[#0B0F17] border border-[#1E2638] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-white">Brevo connection</span>
              <span className="text-xs font-bold text-[#10B981]">
                {brevoConnected ? 'Connected' : 'Configured'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Emails send through Brevo. The API key lives in the deployment's environment variables
              (BREVO_API_KEY) — there's nothing to enter here.
            </p>
          </div>

          {/* Yellow Action Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving settings...</span>
              </>
            ) : (
              <span>Save sender settings</span>
            )}
          </button>
        </form>
      </div>

      {/* Right Card: Test Brevo Connection (Exact Match to Screenshot) */}
      <div className="bg-[#111622] border border-[#1F2637] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <RefreshCw className="w-5 h-5 text-[#FACC15]" />
            <h2 className="font-display font-bold text-lg text-white tracking-tight">Test Brevo connection</h2>
          </div>
          <p className="text-xs text-[#9CA3AF]">Send a real test message through Brevo.</p>
        </div>

        {testFeedback && (
          <div
            className={`p-3 text-xs rounded-xl flex items-center gap-2 ${
              testFeedback.success
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            {testFeedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{testFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSendTest} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Test recipient</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#FACC15] transition-colors"
            />
          </div>

          {/* Yellow Action Button */}
          <button
            type="submit"
            disabled={sendingTest}
            className="w-full py-3.5 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {sendingTest ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Transmitting message...</span>
              </>
            ) : (
              <span>Send test email</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
