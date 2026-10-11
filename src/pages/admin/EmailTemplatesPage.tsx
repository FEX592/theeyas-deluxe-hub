import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.ts';
import { EmailTemplate } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { Edit3 } from 'lucide-react';

export const EmailTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    api
      .getEmailTemplates()
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleEnabled = async (t: EmailTemplate) => {
    try {
      await api.saveEmailTemplate(t.id, { enabled: !t.enabled });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle template status');
    }
  };

  return (
    <AdminLayout
      title="Transactional Email Templates"
      subtitle="HTML email templates sent through Brevo for order updates and WhatsApp invitation links"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#F3F4F6]">
              <thead className="bg-[#0D111A] border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Template Name</th>
                  <th className="py-3 px-4">Event Trigger</th>
                  <th className="py-3 px-4">Subject Line</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Active</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2637]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6B7280]">
                      Loading templates...
                    </td>
                  </tr>
                ) : (
                  templates.map((tmpl) => (
                    <tr key={tmpl.id} className="hover:bg-[#161C2C]/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{tmpl.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[#FACC15] font-semibold">
                        {tmpl.event_key}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#9CA3AF]">
                        {tmpl.subject}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-semibold text-white">v{tmpl.published_version}</span>
                        {tmpl.version > tmpl.published_version && (
                          <span className="text-[10px] text-amber-400 block">(draft v{tmpl.version})</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => toggleEnabled(tmpl)}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border ${
                            tmpl.enabled
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                              : 'bg-gray-800 border-gray-700 text-gray-400'
                          }`}
                        >
                          {tmpl.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/admin/emails/templates/${tmpl.id}`}
                          className="px-3 py-1.5 text-xs font-semibold text-[#FACC15] hover:bg-[#161C2C] border border-[#1E2638] rounded-xl inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit HTML</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
