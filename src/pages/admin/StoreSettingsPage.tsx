import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { StoreSettings } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Settings, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const StoreSettingsPage: React.FC = () => {
  const [storeName, setStoreName] = useState("Theeya's Deluxe Hub");
  const [supportEmail, setSupportEmail] = useState('support@theeyasdeluxehub.com');
  const [supportWhatsapp, setSupportWhatsapp] = useState('+234 800 000 0000');
  const [canonicalUrl, setCanonicalUrl] = useState('https://theeyadeluxehub.vercel.app');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStoreSettings()
      .then((s) => {
        if (s.store_name) setStoreName(s.store_name);
        if (s.support_email) setSupportEmail(s.support_email);
        if (s.support_whatsapp) setSupportWhatsapp(s.support_whatsapp);
        if (s.canonical_url) setCanonicalUrl(s.canonical_url);
      })
      .catch(console.error);
  }, []);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await api.updateStoreSettings({
        store_name: storeName.trim(),
        support_email: supportEmail.trim(),
        support_whatsapp: supportWhatsapp.trim(),
        canonical_url: canonicalUrl.trim(),
      });
      setFeedback('General store identity settings saved.');
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to save store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Store & Integration Settings"
      subtitle="Manage store identity and customer support contacts"
    >
      <div className="max-w-6xl mx-auto">
        {/* General Store Identity Section (Dark Theme) */}
        <section className="bg-[#111622] border border-[#1F2637] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#FACC15]" />
            <h2 className="font-display font-bold text-lg text-white tracking-tight">Store identity & contact</h2>
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <form onSubmit={handleSaveStore} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Store brand name</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white focus:outline-none focus:border-[#FACC15] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Canonical production URL</label>
                <input
                  type="url"
                  required
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white font-mono focus:outline-none focus:border-[#FACC15] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Support email address</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white focus:outline-none focus:border-[#FACC15] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Support WhatsApp number</label>
                <input
                  type="text"
                  required
                  value={supportWhatsapp}
                  onChange={(e) => setSupportWhatsapp(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl text-white focus:outline-none focus:border-[#FACC15] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-3 px-6 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Saving store settings...</span>
                </>
              ) : (
                <span>Save store identity settings</span>
              )}
            </button>
          </form>
        </section>
      </div>
    </AdminLayout>
  );
};
