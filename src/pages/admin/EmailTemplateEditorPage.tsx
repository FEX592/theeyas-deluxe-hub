import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { EmailTemplate } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { renderTemplate } from '../../lib/template.ts';
import {
  ArrowLeft,
  Save,
  UploadCloud,
  RotateCcw,
  Send,
  Eye,
  Code2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export const EmailTemplateEditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Editor Fields
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlSource, setHtmlSource] = useState('');
  const [enabled, setEnabled] = useState(true);

  // Tab View: Code vs Preview
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Test send state
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const supportedVariables = [
    'customer_name',
    'customer_email',
    'whatsapp_number',
    'order_id',
    'listing_name',
    'listing_type',
    'listing_category',
    'amount',
    'currency',
    'payment_status',
    'order_status',
    'payment_reference',
    'paid_at',
    'created_at',
    'tracking_url',
    'order_url',
    'access_url',
    'fulfillment_mode',
    'store_name',
    'support_email',
    'support_whatsapp',
  ];

  const loadData = () => {
    if (!templateId) return;
    setLoading(true);
    api
      .getEmailTemplate(templateId)
      .then((t) => {
        setTemplate(t);
        setName(t.name);
        setSubject(t.subject);
        setHtmlSource(t.html_source || '');
        setEnabled(t.enabled);
      })
      .catch((err) => {
        setFeedback({ type: 'error', message: err.message || 'Failed to load template' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [templateId]);

  const handleSaveDraft = async () => {
    if (!templateId) return;
    setSavingDraft(true);
    setFeedback(null);
    try {
      const updated = await api.saveEmailTemplate(templateId, {
        name,
        subject,
        html_source: htmlSource,
        enabled,
      });
      setTemplate(updated);
      setFeedback({ type: 'success', message: 'Template draft saved successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save draft' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    if (!templateId) return;
    setPublishing(true);
    setFeedback(null);
    try {
      const updated = await api.publishEmailTemplate(templateId);
      setTemplate(updated);
      setFeedback({
        type: 'success',
        message: `Version ${updated.published_version} published as the live production template.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to publish version' });
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async () => {
    if (!templateId || !template) return;
    if (!window.confirm('Discard current draft edits and restore the published version?')) return;
    try {
      const updated = await api.rollbackEmailTemplate(templateId);
      setTemplate(updated);
      setHtmlSource(updated.html_source || '');
      setSubject(updated.subject);
      setName(updated.name);
      setFeedback({ type: 'success', message: 'Draft reverted to published production version.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to discard draft' });
    }
  };

  const handleTestSend = async () => {
    if (!templateId || !testEmail.trim()) {
      setFeedback({ type: 'error', message: 'Please provide a test recipient email address.' });
      return;
    }
    setSendingTest(true);
    setFeedback(null);
    try {
      const res = await api.sendTestEmail(templateId, testEmail.trim());
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Test email dispatched to ${testEmail}! Check inbox or outbox logs.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to dispatch test message.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error sending test' });
    } finally {
      setSendingTest(false);
    }
  };

  const renderedPreview = useMemo(() => {
    const mockVars: Record<string, any> = {
      customer_name: 'Babajide Adeleke',
      customer_email: 'babajide@example.com',
      whatsapp_number: '+234 802 345 6789',
      order_id: 'TDH-2026-9921',
      listing_name: 'Lagos Tech Founders Inner Circle',
      listing_type: 'WhatsApp Group',
      listing_category: 'Tech & Startups',
      amount: '₦15,000',
      currency: 'NGN',
      payment_status: 'Paid',
      order_status: 'Completed',
      payment_reference: 'pay_sample_ref_9921',
      paid_at: new Date().toLocaleDateString(),
      created_at: new Date().toLocaleDateString(),
      tracking_url: 'https://theeyasdeluxehub.com/track-order?ref=TDH-2026-9921',
      order_url: 'https://theeyasdeluxehub.com/orders/sample-order-id',
      access_url: 'https://chat.whatsapp.com/G4YFoundersExclusiveAccess',
      fulfillment_mode: 'automatic',
      store_name: "Theeya's Deluxe Hub",
      support_email: 'support@theeyasdeluxehub.com',
      support_whatsapp: '+234 800 000 0000',
    };
    return renderTemplate(htmlSource, mockVars);
  }, [htmlSource]);

  const copyVariable = (varName: string) => {
    navigator.clipboard.writeText(`{{${varName}}}`);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  return (
    <AdminLayout
      title={`HTML Editor: ${template?.name || 'Template'}`}
      subtitle={`Event Trigger: ${template?.event_key || ''} · HTML Source Only`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#111622] border border-[#1F2637] hover:bg-[#161C2C] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <UploadCloud className="w-3.5 h-3.5 text-black" />
            <span>{publishing ? 'Publishing...' : 'Publish Version'}</span>
          </button>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/admin/emails/templates"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Template List</span>
          </Link>

          {template && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-[#9CA3AF]">
                Live Published: <strong className="text-[#10B981]">v{template.published_version}</strong>
              </span>
              <span className="text-[#6B7280]">·</span>
              <span className="text-[#9CA3AF]">
                Current Draft: <strong className="text-white">v{template.version}</strong>
              </span>
              {template.version > template.published_version && (
                <button
                  onClick={handleRollback}
                  className="inline-flex items-center gap-1 text-xs text-[#FACC15] hover:underline font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Discard Draft</span>
                </button>
              )}
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Configuration Bar */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-5 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
              Subject Line (Supports Variables)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <label className="flex items-center gap-2 text-xs font-semibold text-[#9CA3AF] cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-[#FACC15] focus:ring-0 bg-[#0B0F17] border-[#1E2638]"
              />
              <span className="text-white">Enabled</span>
            </label>
          </div>
        </div>

        {/* Supported Variables Allowlist Panel */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-5 shadow-xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF] block mb-2">
            Permitted Template Variables (Click to copy)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {supportedVariables.map((v) => (
              <button
                key={v}
                onClick={() => copyVariable(v)}
                className="px-2.5 py-1 text-[11px] font-mono bg-[#0B0F17] hover:bg-[#161C2C] border border-[#1E2638] rounded-lg text-[#FACC15] flex items-center gap-1 cursor-pointer transition-colors"
                title="Copy variable tag"
              >
                <span>{`{{${v}}}`}</span>
                {copiedVar === v ? (
                  <Check className="w-3 h-3 text-[#10B981]" />
                ) : (
                  <Copy className="w-3 h-3 text-[#6B7280]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor / Preview Panes */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] shadow-xl overflow-hidden flex flex-col">
          {/* Tab Selector */}
          <div className="bg-[#0D111A] border-b border-[#1F2637] px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-[#161C2C] text-[#FACC15] border border-[#FACC15]/30'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>HTML Source Code</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#161C2C] text-[#FACC15] border border-[#FACC15]/30'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Rendered HTML Preview</span>
              </button>
            </div>

            <span className="text-[11px] text-[#6B7280] font-mono">
              {htmlSource.length} characters
            </span>
          </div>

          {/* Editor Workspace */}
          {activeTab === 'editor' ? (
            <div className="p-4 bg-[#0B0F17]">
              <textarea
                value={htmlSource}
                onChange={(e) => setHtmlSource(e.target.value)}
                rows={24}
                spellCheck={false}
                className="w-full font-mono text-xs text-[#E6E6EB] bg-transparent resize-y focus:outline-none leading-relaxed"
                placeholder="<!DOCTYPE html><html>...</html>"
              />
            </div>
          ) : (
            <div className="p-6 bg-[#0B0F17]">
              <div className="max-w-2xl mx-auto bg-white rounded-xl border border-[#1F2637] overflow-hidden shadow-xl">
                <iframe
                  title="Rendered Email Preview"
                  srcDoc={renderedPreview}
                  sandbox="allow-same-origin"
                  className="w-full h-[600px] border-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Test Send Panel */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-sm text-white">Dispatch Test Email</h3>
            <p className="text-xs text-[#9CA3AF]">
              Send this template with sample customer data directly to an email inbox via Brevo API.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="email"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white w-64"
            />
            <button
              onClick={handleTestSend}
              disabled={sendingTest}
              className="px-4 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5 text-black" />
              <span>{sendingTest ? 'Sending...' : 'Send Test'}</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
