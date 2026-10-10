import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.ts';
import { Profile, AdminInvite } from '../../types.ts';
import { AdminLayout } from '../../components/AdminLayout.tsx';
import { UserPlus, Copy, Check, Trash2 } from 'lucide-react';

export const AdministratorsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviting, setInviting] = useState(false);

  const loadData = () => {
    setLoading(true);
    api
      .getAdmins()
      .then((res) => {
        setProfiles(res.profiles);
        setInvites(res.invites);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setGeneratedLink(null);

    try {
      const res = await api.inviteAdmin(inviteEmail.trim());
      const fullUrl = `${window.location.origin}${res.link}`;
      setGeneratedLink(fullUrl);
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!window.confirm('Revoke this invitation? It will immediately become unusable.')) return;
    try {
      await api.revokeInvite(inviteId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invite');
    }
  };

  const copyInvite = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout
      title="Administrator Management"
      subtitle="Authorized operators, role access control, and single-use staff invitations"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Create Invitation Box */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#FACC15]">
            <UserPlus className="w-4 h-4 text-[#FACC15]" />
            <span>Invite New Administrator</span>
          </div>
          <h2 className="font-display font-bold text-lg text-white">Issue Single-Use Admin Invitation</h2>
          <p className="text-xs text-[#9CA3AF]">
            Enter the staff member's email address. TDH will generate a secure single-use invitation token.
          </p>

          <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
            <input
              type="email"
              required
              placeholder="colleague@theeyasdeluxehub.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-xs bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-60"
            >
              {inviting ? 'Generating...' : 'Generate Single-Use Link'}
            </button>
          </form>

          {generatedLink && (
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1E2638] space-y-2 text-xs text-white">
              <span className="font-bold text-[#FACC15] block">One-Time Invitation Link Generated:</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-3 py-2 font-mono text-xs bg-[#111622] border border-[#1F2637] rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={() => copyInvite(generatedLink)}
                  className="px-3.5 py-2 bg-[#FACC15] text-black rounded-lg font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Admins List */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#1F2637] bg-[#0D111A] flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white">Active Administrative Staff</h3>
            <span className="text-xs text-[#9CA3AF] font-mono">{profiles.length} total</span>
          </div>

          <table className="w-full text-left text-xs text-[#F3F4F6]">
            <thead className="border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Established Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2637]">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-[#161C2C]/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{p.display_name}</td>
                  <td className="py-3.5 px-4 font-mono text-[#9CA3AF]">{p.email}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        p.role === 'owner'
                          ? 'bg-[#161C2C] border-[#1F2637] text-[#FACC15] font-bold'
                          : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      }`}
                    >
                      {p.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#6B7280] font-mono text-[11px]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pending Invites List */}
        <div className="bg-[#111622] rounded-2xl border border-[#1F2637] overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#1F2637] bg-[#0D111A] flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white">Unused Pending Invitations</h3>
            <span className="text-xs text-[#9CA3AF] font-mono">{invites.length} tokens</span>
          </div>

          <table className="w-full text-left text-xs text-[#F3F4F6]">
            <thead className="border-b border-[#1F2637] text-[#9CA3AF] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Target Email</th>
                <th className="py-3 px-4">Role Assigned</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4 text-right">Revoke</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2637]">
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#6B7280]">
                    No outstanding invites.
                  </td>
                </tr>
              ) : (
                invites.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#161C2C]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-white">{inv.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#161C2C] border border-[#1F2637] text-[#FACC15]">
                        {(inv.role || 'admin').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#6B7280] text-[11px]">
                      {new Date(inv.expires_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="p-1.5 text-red-400 hover:bg-red-950/50 rounded cursor-pointer"
                        title="Revoke Token"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
