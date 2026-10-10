import {
  Listing,
  Category,
  Order,
  OrderFulfillment,
  PaymentProviderConfig,
  EmailTemplate,
  EmailOutboxJob,
  EmailLogEntry,
  AdminInvite,
  AuditLogEntry,
  StoreSettings,
  Profile,
  BootstrapState,
} from '../types.ts';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const userJson = localStorage.getItem('tdh_user');
  let actorEmail = '';
  if (userJson) {
    try {
      const user = JSON.parse(userJson);
      actorEmail = user.email || '';
    } catch {}
  }

  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }
  if (actorEmail) {
    headers.set('x-actor-email', actorEmail);
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Config & Health
  getConfig: () => fetchJson<{ store_name: string; currency: string; support_email: string; support_whatsapp: string; bootstrap_claimed: boolean }>('/api/config'),
  getHealth: () => fetchJson<{ status: string; brevo_configured: boolean; paystack_configured: boolean; outbox_pending_jobs: number; bootstrap_claimed: boolean }>('/api/health'),

  // Auth & Bootstrap
  getBootstrapStatus: () => fetchJson<BootstrapState>('/api/admin/bootstrap-status'),
  claimBootstrap: (email: string, displayName: string, secret?: string) =>
    fetchJson<{ success: boolean; profile: Profile }>('/api/admin/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ email, displayName, secret }),
    }),
  login: (email: string) =>
    fetchJson<{ success: boolean; profile: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  signup: (email: string, displayName?: string) =>
    fetchJson<{ success: boolean; profile: Profile }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, displayName }),
    }),
  getMe: (email?: string) =>
    fetchJson<{ profile: Profile | null }>(`/api/auth/me${email ? `?email=${encodeURIComponent(email)}` : ''}`),

  // Categories
  getCategories: () => fetchJson<Category[]>('/api/categories'),
  getAdminCategories: () => fetchJson<Category[]>('/api/admin/categories'),
  saveCategory: (category: Partial<Category>) =>
    fetchJson<Category>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    }),
  deleteCategory: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  // Listings
  getPublicListings: () => fetchJson<Listing[]>('/api/listings'),
  getListing: (idOrSlug: string) => fetchJson<Listing>(`/api/listings/${encodeURIComponent(idOrSlug)}`),
  getAdminListings: () => fetchJson<Listing[]>('/api/admin/listings'),
  getAdminListing: (id: string) => fetchJson<Listing>(`/api/admin/listings/${encodeURIComponent(id)}`),
  saveListing: (listing: Partial<Listing>) =>
    fetchJson<Listing>('/api/admin/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    }),
  deleteListing: (id: string) =>
    fetchJson<{ success: boolean }>(`/api/admin/listings/${id}`, { method: 'DELETE' }),
  smartImport: (url: string) =>
    fetchJson<{
      success: boolean;
      type: 'group' | 'channel';
      source_url: string;
      extracted_fields: any;
      missing_fields: string[];
      notes: string;
    }>('/api/admin/listings/smart-import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  // Payments & Checkout
  initializePayment: (data: {
    listing_id: string;
    customer_name: string;
    customer_email: string;
    whatsapp_number: string;
    user_id?: string;
  }) =>
    fetchJson<{
      success: boolean;
      order_id: string;
      order_number: string;
      tracking_token: string;
      authorization_url: string;
      reference: string;
      simulated?: boolean;
    }>('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  verifyPayment: (reference: string) =>
    fetchJson<{
      success: boolean;
      order_id: string;
      order_number: string;
      payment_status: string;
      order_status: string;
      auto_fulfilled?: boolean;
      message?: string;
    }>(`/api/payments/verify?reference=${encodeURIComponent(reference)}`),
  getPaymentProviders: () =>
    fetchJson<{ installed: PaymentProviderConfig[] }>('/api/payments/providers'),
  updatePaymentSettings: (settings: Partial<PaymentProviderConfig>) =>
    fetchJson<PaymentProviderConfig>('/api/admin/payments/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  // Orders & Fulfillment
  trackOrder: (orderId: string, identifier: string) =>
    fetchJson<{ order: Order; fulfillment: { access_url: string; fulfilled_at: string } | null }>(
      `/api/orders/track?orderId=${encodeURIComponent(orderId)}&identifier=${encodeURIComponent(identifier)}`
    ),
  getOrder: (id: string) =>
    fetchJson<{ order: Order; fulfillment: { access_url: string; fulfilled_at: string } | null }>(
      `/api/orders/${encodeURIComponent(id)}`
    ),
  getAdminOrders: () => fetchJson<Order[]>('/api/admin/orders'),
  getAdminOrder: (id: string) =>
    fetchJson<{
      order: Order;
      fulfillment?: OrderFulfillment;
      transactions: any[];
      email_logs: EmailLogEntry[];
    }>(`/api/admin/orders/${encodeURIComponent(id)}`),
  fulfillOrder: (orderId: string, accessUrl: string, notes?: string) =>
    fetchJson<{ success: boolean; order: Order; fulfillment: OrderFulfillment }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/fulfill`,
      {
        method: 'POST',
        body: JSON.stringify({ access_url: accessUrl, notes }),
      }
    ),
  resendAccessEmail: (orderId: string) =>
    fetchJson<{ success: boolean; message: string }>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/resend-access`,
      { method: 'POST' }
    ),

  // Email Templates & Automation
  getEmailTemplates: () => fetchJson<EmailTemplate[]>('/api/admin/emails/templates'),
  getEmailTemplate: (id: string) => fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}`),
  saveEmailTemplate: (id: string, data: Partial<EmailTemplate>) =>
    fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  publishEmailTemplate: (id: string) =>
    fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}/publish`, {
      method: 'POST',
    }),
  rollbackEmailTemplate: (id: string) =>
    fetchJson<EmailTemplate>(`/api/admin/emails/templates/${encodeURIComponent(id)}/rollback`, {
      method: 'POST',
    }),
  sendTestEmail: (templateId: string, recipientEmail: string, variables?: Record<string, any>) =>
    fetchJson<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }>(
      '/api/admin/emails/test',
      {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId, recipient_email: recipientEmail, variables }),
      }
    ),
  getEmailOutbox: () => fetchJson<EmailOutboxJob[]>('/api/admin/emails/outbox'),
  processOutbox: () => fetchJson<{ processed: number; succeeded: number; failed: number }>('/api/admin/emails/process-outbox', { method: 'POST' }),
  getEmailLogs: (params?: { event_key?: string; status?: string; query?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return fetchJson<EmailLogEntry[]>(`/api/admin/emails/logs${q ? `?${q}` : ''}`);
  },
  retryEmailJob: (jobId: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/admin/emails/retry/${encodeURIComponent(jobId)}`, {
      method: 'POST',
    }),

  // Admin Management & Audit
  getAdmins: () => fetchJson<{ profiles: Profile[]; invites: AdminInvite[] }>('/api/admin/admins'),
  inviteAdmin: (email: string) =>
    fetchJson<{ invite: AdminInvite; token: string; link: string }>('/api/admin/admins/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  revokeInvite: (inviteId: string) =>
    fetchJson<{ success: boolean }>('/api/admin/admins/revoke-invite', {
      method: 'POST',
      body: JSON.stringify({ invite_id: inviteId }),
    }),
  redeemInvite: (token: string, email: string, displayName: string) =>
    fetchJson<{ success: boolean; profile: Profile }>('/api/admin/invite/redeem', {
      method: 'POST',
      body: JSON.stringify({ token, email, displayName }),
    }),
  getAuditLogs: () => fetchJson<AuditLogEntry[]>('/api/admin/audit-log'),
  getStoreSettings: () => fetchJson<StoreSettings>('/api/admin/settings'),
  updateStoreSettings: (settings: Partial<StoreSettings>) =>
    fetchJson<StoreSettings>('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
};
