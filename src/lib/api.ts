import {
  Listing, Category, Order, OrderFulfillment, PaymentProviderConfig, EmailTemplate,
  EmailOutboxJob, EmailLogEntry, AdminInvite, AuditLogEntry, StoreSettings, Profile, BootstrapState,
} from '../types.ts';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.method && options.method !== 'GET') headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...options, headers, credentials: 'same-origin', ...(options?.method && options.method !== 'GET' ? {} : { cache: 'no-store' }) });
  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    try { const errData = await response.json(); errorMsg = errData.error || errData.message || errorMsg; } catch {}
    throw new Error(errorMsg);
  }
  return response.json();
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export const api = {
  getConfig: () => fetchJson<{ store_name: string; currency: string; support_email: string; support_whatsapp: string; bootstrap_claimed: boolean }>('/api/config'),
  getHealth: () => fetchJson<{ status: string; auth_configured: boolean; has_admin_account: boolean; brevo_configured: boolean; paystack_configured: boolean; outbox_pending_jobs: number; bootstrap_claimed: boolean }>('/api/health'),
  getBootstrapStatus: () => fetchJson<BootstrapState>('/api/admin/bootstrap-status'),
  login: (email: string, password: string) => fetchJson<{ success: boolean; profile: Profile }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, displayName: string, password: string) => fetchJson<{ success: boolean; first_account: boolean; profile: Profile }>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, displayName, password }) }),
  getMe: () => fetchJson<{ profile: Profile | null; authenticated: boolean; has_admin: boolean }>('/api/auth/session'),
  logout: () => fetchJson<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  deleteAccount: (password: string) => fetchJson<{ success: boolean }>('/api/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) }),
  getCategories: () => fetchJson<Category[]>('/api/categories'),
  getAdminCategories: () => fetchJson<Category[]>('/api/admin/categories'),
  saveCategory: (category: Partial<Category>) => fetchJson<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify(category) }),
  deleteCategory: (id: string) => fetchJson<{ success: boolean }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  getPublicListings: () => fetchJson<Listing[]>('/api/listings'),
  getListing: (idOrSlug: string) => fetchJson<Listing>(`/api/listings/${encodeURIComponent(idOrSlug)}`),
  getAdminListings: () => fetchJson<Listing[]>('/api/admin/listings'),
  getAdminListing: (id: string) => fetchJson<Listing>(`/api/admin/listings/${encodeURIComponent(id)}`),
  saveListing: (listing: Partial<Listing>) => fetchJson<Listing>('/api/admin/listings', { method: 'POST', body: JSON.stringify(listing) }),
  deleteListing: (id: string) => fetchJson<{ success: boolean }>(`/api/admin/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadListingCover: async (file: File) => fetchJson<{ url: string }>('/api/admin/listing-covers', { method: 'POST', body: JSON.stringify({ mime_type: file.type, data_base64: await fileToBase64(file) }) }),
  smartImport: (url: string) => fetchJson<any>('/api/admin/listings/smart-import', { method: 'POST', body: JSON.stringify({ url }) }),
  initializePayment: (data: { listing_id: string; customer_name: string; customer_email: string; whatsapp_number: string; user_id?: string }) => fetchJson<any>('/api/payments/initialize', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (reference: string) => fetchJson<any>(`/api/payments/verify?reference=${encodeURIComponent(reference)}`),
  getPaymentProviders: () => fetchJson<{ installed: PaymentProviderConfig[] }>('/api/payments/providers'),
  updatePaymentSettings: (settings: Partial<PaymentProviderConfig>) => fetchJson<PaymentProviderConfig>('/api/admin/payments/settings', { method: 'POST', body: JSON.stringify(settings) }),
  trackOrder: (orderId: string, identifier: string) => fetchJson<{ order: Order; fulfillment: { access_url: string; fulfilled_at: string } | null }>(`/api/orders/track?orderId=${encodeURIComponent(orderId)}&identifier=${encodeURIComponent(identifier)}`),
  getOrder: (id: string) => fetchJson<{ order: Order; fulfillment: { access_url: string; fulfilled_at: string } | null }>(`/api/orders/${encodeURIComponent(id)}`),
  getAdminOrders: () => fetchJson<Order[]>('/api/admin/orders'),
  getAdminOrder: (id: string) => fetchJson<any>(`/api/admin/orders/${encodeURIComponent(id)}`),
  fulfillOrder: (orderId: string, accessUrl: string, notes?: string) => fetchJson<any>(`/api/admin/orders/${encodeURIComponent(orderId)}/fulfill`, { method: 'POST', body: JSON.stringify({ access_url: accessUrl, notes }) }),
  resendAccessEmail: (orderId: string) => fetchJson<any>(`/api/admin/orders/${encodeURIComponent(orderId)}/resend-access`, { method: 'POST' }),
  getEmailTemplates: () => fetchJson<EmailTemplate[]>('/api/admin/emails/templates'),
  getEmailTemplate: (id: string) => fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}`),
  saveEmailTemplate: (id: string, data: Partial<EmailTemplate>) => fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify(data) }),
  publishEmailTemplate: (id: string) => fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  rollbackEmailTemplate: (id: string) => fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}/rollback`, { method: 'POST' }),
  sendTestEmail: (templateId: string, recipientEmail: string, variables?: Record<string, any>) => fetchJson<any>('/api/admin/emails/test', { method: 'POST', body: JSON.stringify({ template_id: templateId, recipient_email: recipientEmail, variables }) }),
  getEmailOutbox: () => fetchJson<EmailOutboxJob[]>('/api/admin/emails/outbox'),
  processOutbox: () => fetchJson<any>('/api/admin/emails/process-outbox', { method: 'POST' }),
  getEmailLogs: (params?: { event_key?: string; status?: string; query?: string }) => { const q = new URLSearchParams(params as any).toString(); return fetchJson<EmailLogEntry[]>(`/api/admin/emails/logs${q ? `?${q}` : ''}`); },
  retryEmailJob: (jobId: string) => fetchJson<any>(`/api/admin/emails/retry/${encodeURIComponent(jobId)}`, { method: 'POST' }),
  getAdmins: () => fetchJson<{ profiles: Profile[]; invites: AdminInvite[] }>('/api/admin/admins'),
  inviteAdmin: (email: string) => fetchJson<any>('/api/admin/admins/invite', { method: 'POST', body: JSON.stringify({ email }) }),
  revokeInvite: (inviteId: string) => fetchJson<any>('/api/admin/admins/revoke-invite', { method: 'POST', body: JSON.stringify({ invite_id: inviteId }) }),
  redeemInvite: (token: string, email: string, displayName: string) => fetchJson<any>('/api/admin/invite/redeem', { method: 'POST', body: JSON.stringify({ token, email, displayName }) }),
  getAuditLogs: () => fetchJson<AuditLogEntry[]>('/api/admin/audit-log'),
  getStoreSettings: () => fetchJson<StoreSettings>('/api/admin/settings'),
  updateStoreSettings: (settings: Partial<StoreSettings>) => fetchJson<StoreSettings>('/api/admin/settings', { method: 'POST', body: JSON.stringify(settings) }),
};
