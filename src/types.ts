export type UserRole = 'customer' | 'admin' | 'owner';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface BootstrapState {
  claimed: boolean;
  owner_id: string | null;
  claimed_at: string | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  sort_order: number;
  active: boolean;
}

export type ListingType = 'group' | 'channel';
export type ListingStatus = 'published' | 'draft' | 'archived';
export type ListingAvailability = 'available' | 'sold_out' | 'paused';
export type FulfillmentMode = 'automatic' | 'manual';

export interface Listing {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string;
  type: ListingType;
  category_id: string;
  price_ngn: number;
  status: ListingStatus;
  availability: ListingAvailability;
  featured: boolean;
  fulfillment_mode: FulfillmentMode;
  created_at: string;
  updated_at: string;
  internal_source_url?: string;
  customer_access_url?: string;
}

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'
  | 'unknown';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface OrderListingSnapshot {
  id: string;
  name: string;
  type: ListingType;
  category_name: string;
  price_ngn: number;
  fulfillment_mode: FulfillmentMode;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  whatsapp_number: string;
  listing_id: string;
  listing_snapshot: OrderListingSnapshot;
  amount_kobo: number;
  currency: 'NGN';
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  completed_at: string | null;
}

export interface OrderFulfillment {
  order_id: string;
  access_url: string;
  fulfilled_by: string;
  fulfilled_at: string;
  notes?: string;
}

export interface PaymentProviderConfig {
  key: 'paystack';
  name: string;
  enabled: boolean;
  environment: 'test' | 'live';
  subaccount_code: string;
  split_code: string;
  fee_bearer: 'account' | 'subaccount';
  has_secret: boolean;
  last_tested_at: string | null;
  capabilities: string[];
}

export interface EmailTemplate {
  id: string;
  event_key: string;
  name: string;
  subject: string;
  html_source: string;
  body_html?: string;
  enabled: boolean;
  version: number;
  published_version: number;
  published_html: string;
  published_subject: string;
  updated_at: string;
  published_at: string;
}

export interface EmailOutboxJob {
  id: string;
  idempotency_key: string;
  event_key: string;
  order_id: string | null;
  template_id: string;
  template_version: number;
  recipient: string;
  rendered_subject: string;
  status: 'queued' | 'processing' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  next_retry_at: string;
  brevo_message_id: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface EmailLogEntry {
  id: string;
  outbox_id: string;
  event_key: string;
  recipient: string;
  order_id: string | null;
  template_name: string;
  status: string;
  brevo_message_id: string | null;
  error_message: string | null;
  timestamp: string;
}

export interface AdminInvite {
  id: string;
  email: string;
  role?: UserRole;
  created_by: string;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

export interface StoreSettings {
  store_name: string;
  support_email: string;
  support_whatsapp: string;
  currency: string;
  canonical_url: string;
  brevo_sender_email: string;
  brevo_sender_name: string;
  brevo_reply_to: string;
}
