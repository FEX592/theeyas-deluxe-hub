import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import {
  Profile,
  BootstrapState,
  AdminInvite,
  Category,
  Listing,
  ListingPrivateLink,
  Order,
  OrderFulfillment,
  PaymentTransaction,
  PaymentProviderConfig,
  EmailTemplate,
  EmailOutboxJob,
  EmailLogEntry,
  AuditLogEntry,
  StoreSettings,
} from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REMOTE_STATE_URL = SUPABASE_URL ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/tdh_app_state` : '';

function remoteStateConfigured(): boolean {
  return Boolean(REMOTE_STATE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function remoteRequest(): any {
  if (!remoteStateConfigured()) return null;
  const readUrl = `${REMOTE_STATE_URL}?key=eq.store&updated_at=gte.1970-01-01T00%3A00%3A00Z&select=state,updated_at&limit=1&order=updated_at.desc`;
  const args = ['-fsS', '--max-time', '8', '-X', 'GET', readUrl,
    '-H', `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    '-H', `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    '-H', 'Content-Type: application/json',
    '-H', 'Cache-Control: no-cache',
    '-H', 'Pragma: no-cache'];
  try {
    const output = execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return output ? JSON.parse(output) : null;
  } catch (err) {
    console.error('[Supabase] Durable state request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function writeRemoteState(state: StoreData, expectedUpdatedAt?: string): any {
  const inserting = !expectedUpdatedAt;
  const url = inserting
    ? `${REMOTE_STATE_URL}?on_conflict=key&select=updated_at`
    : `${REMOTE_STATE_URL}?key=eq.store&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}&select=updated_at`;
  const method = inserting ? 'POST' : 'PATCH';
  const nextTimestamp = Math.max(Date.now(), expectedUpdatedAt ? Date.parse(expectedUpdatedAt) + 1 : 0);
  const row = { ...(inserting ? { key: 'store' } : {}), state, updated_at: new Date(nextTimestamp).toISOString() };
  const args = ['-fsS', '--max-time', '8', '-X', method, url,
    '-H', `apikey: ${SUPABASE_SERVICE_ROLE_KEY}`,
    '-H', `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    '-H', 'Content-Type: application/json',
    '-H', 'Cache-Control: no-cache',
    '-H', inserting ? 'Prefer: resolution=ignore-duplicates,return=representation' : 'Prefer: return=representation',
    '--data-binary', JSON.stringify(inserting ? [row] : row)];
  try {
    const output = execFileSync('curl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return output ? JSON.parse(output) : null;
  } catch (err) {
    console.error('[Supabase] Durable state write failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

function cloneState<T>(value: T): T {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameState(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function entityKey(value: any): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const key = value.id ?? value.key ?? value.order_id ?? value.listing_id ?? value.slug ?? value.token_hash;
  return key === undefined || key === null ? null : String(key);
}

// Three-way merge lets independent Vercel instances save without replacing
// newer data with a stale in-memory snapshot. For entity lists, deletion wins
// over an instance that still has an older copy of the deleted row.
function mergeState(base: any, local: any, remote: any): any {
  if (sameState(local, base)) return cloneState(remote);
  if (sameState(remote, base)) return cloneState(local);
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    if (![...base, ...local, ...remote].every((item) => entityKey(item) !== null)) return cloneState(local);
    const baseMap = new Map(base.map((item) => [entityKey(item)!, item]));
    const localMap = new Map(local.map((item) => [entityKey(item)!, item]));
    const remoteMap = new Map(remote.map((item) => [entityKey(item)!, item]));
    const keys = [...new Set([...remoteMap.keys(), ...localMap.keys(), ...baseMap.keys()])];
    const merged: any[] = [];
    for (const key of keys) {
      const hadBase = baseMap.has(key);
      const hasLocal = localMap.has(key);
      const hasRemote = remoteMap.has(key);
      if (hadBase && (!hasLocal || !hasRemote)) continue;
      if (!hadBase && !hasLocal && !hasRemote) continue;
      if (hasLocal && hasRemote) {
        merged.push(mergeState(baseMap.get(key), localMap.get(key), remoteMap.get(key)));
      } else if (hasLocal) {
        merged.push(cloneState(localMap.get(key)));
      } else if (hasRemote) {
        merged.push(cloneState(remoteMap.get(key)));
      }
    }
    return merged;
  }
  if (base && local && remote && !Array.isArray(base) && !Array.isArray(local) && !Array.isArray(remote)
    && typeof base === 'object' && typeof local === 'object' && typeof remote === 'object') {
    const result: Record<string, any> = {};
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      const value = mergeState(base[key], local[key], remote[key]);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  return cloneState(local);
}

interface StoreData {
  profiles: Profile[];
  bootstrap: BootstrapState;
  admin_invites: AdminInvite[];
  categories: Category[];
  listings: Listing[];
  private_links: ListingPrivateLink[];
  orders: Order[];
  fulfillments: OrderFulfillment[];
  transactions: PaymentTransaction[];
  provider_config: PaymentProviderConfig;
  email_templates: EmailTemplate[];
  email_outbox: EmailOutboxJob[];
  email_logs: EmailLogEntry[];
  audit_logs: AuditLogEntry[];
  settings: StoreSettings;
}

const defaultCategories: Category[] = [
  {
    id: 'cat-tech',
    slug: 'business-and-tech',
    name: 'Business & Tech',
    icon: 'Briefcase',
    description: 'Founders, developers, and tech leadership syndicates in emerging markets.',
    sort_order: 1,
    active: true,
  },
  {
    id: 'cat-realestate',
    slug: 'real-estate-and-land',
    name: 'Real Estate & Land',
    icon: 'Building2',
    description: 'Off-market commercial opportunities, joint ventures, and verified plots.',
    sort_order: 2,
    active: true,
  },
  {
    id: 'cat-finance',
    slug: 'finance-and-investing',
    name: 'Finance & Investing',
    icon: 'TrendingUp',
    description: 'Macro briefings, venture deals, crypto regulatory updates, and FX desks.',
    sort_order: 3,
    active: true,
  },
  {
    id: 'cat-trade',
    slug: 'trade-and-commerce',
    name: 'Trade & Commerce',
    icon: 'Ship',
    description: 'Import-export corridors, agro-commodities logistics, and customs intelligence.',
    sort_order: 4,
    active: true,
  },
  {
    id: 'cat-creative',
    slug: 'design-and-creative',
    name: 'Design & Creative',
    icon: 'Palette',
    description: 'Senior digital product designers, brand strategists, and agency owners.',
    sort_order: 5,
    active: true,
  },
  {
    id: 'cat-luxury',
    slug: 'luxury-and-lifestyle',
    name: 'Luxury & Lifestyle',
    icon: 'Gem',
    description: 'Private collectors, high-end timepieces, and executive automotive networks.',
    sort_order: 6,
    active: true,
  },
];

const defaultListings: Listing[] = [
  {
    id: 'lst-founders-syndicate',
    slug: 'west-africa-founders-syndicate',
    name: 'West Africa Founders & Angel Syndicate',
    description:
      'Curated WhatsApp Group bringing together venture-backed technology founders, active angel syndicates, and pan-African operators. Verified peer introductions, deal syndicate co-investments, and hiring channels.',
    image_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    type: 'group',
    category_id: 'cat-tech',
    price_ngn: 25000,
    status: 'published',
    availability: 'available',
    featured: true,
    fulfillment_mode: 'automatic',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lst-lagos-real-estate',
    slug: 'lagos-commercial-real-estate-dealflow',
    name: 'Lagos Commercial Real Estate Dealflow',
    description:
      'Exclusive WhatsApp Channel broadcasting vetted commercial real estate briefs, prime Ikoyi and Victoria Island development sites, and institutional off-market transactions.',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    type: 'channel',
    category_id: 'cat-realestate',
    price_ngn: 40000,
    status: 'published',
    availability: 'available',
    featured: true,
    fulfillment_mode: 'automatic',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lst-fintech-briefings',
    slug: 'african-fintech-regulatory-briefings',
    name: 'African FinTech & Regulatory Intelligence',
    description:
      'Dedicated WhatsApp Channel delivering weekly regulatory compliance briefs, CBN circular analysis, payments licensing updates, and pan-African cross-border settlement trends.',
    image_url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    type: 'channel',
    category_id: 'cat-finance',
    price_ngn: 20000,
    status: 'published',
    availability: 'available',
    featured: true,
    fulfillment_mode: 'automatic',
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lst-agro-export-desk',
    slug: 'export-and-agro-commodities-trade-desk',
    name: 'Export & Agro-Commodities Trade Desk',
    description:
      'High-level WhatsApp Group for bulk exporters of cashew, cocoa, sesame, and ginger. Live freight rate sharing, customs clearance updates, and letter-of-credit verification discussions.',
    image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
    type: 'group',
    category_id: 'cat-trade',
    price_ngn: 30000,
    status: 'published',
    availability: 'available',
    featured: false,
    fulfillment_mode: 'manual',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lst-product-design-leaders',
    slug: 'global-remote-product-designers',
    name: 'Senior Remote Product Design Collective',
    description:
      'Private WhatsApp Group for senior product designers, design system engineers, and agency founders working globally across Africa, Europe, and North America. Portfolio critiques and contract leads.',
    image_url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80',
    type: 'group',
    category_id: 'cat-creative',
    price_ngn: 15000,
    status: 'published',
    availability: 'available',
    featured: false,
    fulfillment_mode: 'automatic',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'lst-luxury-automotive',
    slug: 'luxury-automotive-supercars-nigeria',
    name: 'Luxury Automotive & Exotic Supercars Nigeria',
    description:
      'WhatsApp Channel featuring verified luxury vehicle allocations, pre-arrival manifests from Dubai & Germany, exotic parts sourcing, and high-spec vehicle auctions.',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    type: 'channel',
    category_id: 'cat-luxury',
    price_ngn: 35000,
    status: 'published',
    availability: 'available',
    featured: true,
    fulfillment_mode: 'automatic',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const defaultPrivateLinks: ListingPrivateLink[] = [
  {
    listing_id: 'lst-founders-syndicate',
    internal_source_url: 'https://chat.whatsapp.com/G4YFoundersSyndicateSample',
    customer_access_url: 'https://chat.whatsapp.com/G4YFoundersSyndicateSample',
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    listing_id: 'lst-lagos-real-estate',
    internal_source_url: 'https://whatsapp.com/channel/0029VaRealEstateLagosSample',
    customer_access_url: 'https://whatsapp.com/channel/0029VaRealEstateLagosSample',
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    listing_id: 'lst-fintech-briefings',
    internal_source_url: 'https://whatsapp.com/channel/0029VaFintechBriefingsSample',
    customer_access_url: 'https://whatsapp.com/channel/0029VaFintechBriefingsSample',
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    listing_id: 'lst-agro-export-desk',
    internal_source_url: 'https://chat.whatsapp.com/AgroExportDeskNigeriaSample',
    customer_access_url: 'https://chat.whatsapp.com/AgroExportDeskNigeriaSample',
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    listing_id: 'lst-product-design-leaders',
    internal_source_url: 'https://chat.whatsapp.com/DesignCollectiveGlobalSample',
    customer_access_url: 'https://chat.whatsapp.com/DesignCollectiveGlobalSample',
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
  {
    listing_id: 'lst-luxury-automotive',
    internal_source_url: 'https://whatsapp.com/channel/0029VaSupercarsNigeriaSample',
    customer_access_url: 'https://whatsapp.com/channel/0029VaSupercarsNigeriaSample',
    updated_by: 'system',
    updated_at: new Date().toISOString(),
  },
];

const defaultEmailTemplates: EmailTemplate[] = [
  {
    id: 'tmpl-order-created',
    event_key: 'order.created',
    name: 'Order Created Confirmation',
    subject: "Order Confirmation: {{order_id}} — THEEYA'S DELUXE HUB",
    html_source: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #3D183F; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Your order has been created</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, thank you for placing your order on THEEYA'S DELUXE HUB. Your order details are confirmed below. Payment is currently awaiting verification.
        </p>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FAF5FA; border: 1px solid #E8E2E8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Order ID:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{order_id}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Listing:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{listing_name}} ({{listing_type}})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Amount:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 700; text-align: right; color: #5B2A5F;">{{currency}} {{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Payment Status:</td>
            <td style="padding: 6px 0; font-size: 14px; text-align: right; color: #B8934C; font-weight: 600;">{{payment_status}}</td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Once payment is confirmed by Paystack, your order will proceed to fulfillment. Note that your private invitation link will be delivered only after verification is complete.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{{tracking_url}}" style="background-color: #5B2A5F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Track Order Status</a>
        </div>

        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          Need assistance? Reply to this email or contact support at {{support_email}}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    enabled: true,
    version: 1,
    published_version: 1,
    published_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #3D183F; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Your order has been created</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, thank you for placing your order on THEEYA'S DELUXE HUB. Your order details are confirmed below. Payment is currently awaiting verification.
        </p>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FAF5FA; border: 1px solid #E8E2E8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Order ID:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{order_id}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Listing:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{listing_name}} ({{listing_type}})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Amount:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 700; text-align: right; color: #5B2A5F;">{{currency}} {{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Payment Status:</td>
            <td style="padding: 6px 0; font-size: 14px; text-align: right; color: #B8934C; font-weight: 600;">{{payment_status}}</td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Once payment is confirmed by Paystack, your order will proceed to fulfillment. Note that your private invitation link will be delivered only after verification is complete.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{{tracking_url}}" style="background-color: #5B2A5F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Track Order Status</a>
        </div>

        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          Need assistance? Reply to this email or contact support at {{support_email}}.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    published_subject: "Order Confirmation: {{order_id}} — THEEYA'S DELUXE HUB",
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-payment-confirmed',
    event_key: 'payment.confirmed',
    name: 'Payment Confirmed Receipt',
    subject: "Payment Confirmed: Receipt for Order {{order_id}} — THEEYA'S DELUXE HUB",
    html_source: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Confirmed</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #26845A; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Payment Confirmed</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, your payment of <strong>{{currency}} {{amount}}</strong> for order <strong>{{order_id}}</strong> has been successfully verified.
        </p>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FAF5FA; border: 1px solid #E8E2E8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Order ID:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{order_id}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Item:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{listing_name}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Payment Reference:</td>
            <td style="padding: 6px 0; font-size: 13px; font-family: monospace; text-align: right; color: #211F23;">{{payment_reference}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Amount Paid:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 700; text-align: right; color: #26845A;">{{currency}} {{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Paid At:</td>
            <td style="padding: 6px 0; font-size: 14px; text-align: right; color: #211F23;">{{paid_at}}</td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Your WhatsApp Group or Channel order is being processed. For instant delivery listings, your invitation link will arrive shortly.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{{tracking_url}}" style="background-color: #5B2A5F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">View Order Status</a>
        </div>

        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          This email serves as your official payment receipt from THEEYA'S DELUXE HUB.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    enabled: true,
    version: 1,
    published_version: 1,
    published_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Confirmed</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #26845A; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Payment Confirmed</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, your payment of <strong>{{currency}} {{amount}}</strong> for order <strong>{{order_id}}</strong> has been successfully verified.
        </p>
        
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #FAF5FA; border: 1px solid #E8E2E8; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Order ID:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{order_id}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Item:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 600; text-align: right; color: #211F23;">{{listing_name}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Payment Reference:</td>
            <td style="padding: 6px 0; font-size: 13px; font-family: monospace; text-align: right; color: #211F23;">{{payment_reference}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Amount Paid:</td>
            <td style="padding: 6px 0; font-size: 14px; font-weight: 700; text-align: right; color: #26845A;">{{currency}} {{amount}}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #706873;">Paid At:</td>
            <td style="padding: 6px 0; font-size: 14px; text-align: right; color: #211F23;">{{paid_at}}</td>
          </tr>
        </table>

        <p style="font-size: 14px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Your WhatsApp Group or Channel order is being processed. For instant delivery listings, your invitation link will arrive shortly.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{{tracking_url}}" style="background-color: #5B2A5F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">View Order Status</a>
        </div>

        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          This email serves as your official payment receipt from THEEYA'S DELUXE HUB.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    published_subject: "Payment Confirmed: Receipt for Order {{order_id}} — THEEYA'S DELUXE HUB",
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-order-completed',
    event_key: 'order.completed',
    name: 'WhatsApp Group or Channel Invitation',
    subject: "Your WhatsApp Invitation Link for {{listing_name}} — THEEYA'S DELUXE HUB",
    html_source: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your WhatsApp Invitation Link</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #3D183F; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Your WhatsApp invitation link is ready</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, your purchase of <strong>{{listing_name}}</strong> (order <strong>{{order_id}}</strong>) is confirmed. Use the verified WhatsApp invitation link below to join the Group or Channel.
        </p>
        
        <div style="background-color: #FAF5FA; border: 1px solid #D6B36A; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #706873; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 12px;">Verified Invitation Link</p>
          <a href="{{access_url}}" style="background-color: #26845A; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 700; display: inline-block;">Join {{listing_name}} on WhatsApp</a>
          <p style="font-size: 12px; color: #706873; margin-top: 14px; margin-bottom: 0;">Direct URL: <a href="{{access_url}}" style="color: #5B2A5F; word-break: break-all;">{{access_url}}</a></p>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          <strong>Security notice:</strong> This invitation link is unique to your purchase. Do not share or forward this link.
        </p>

        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          You can also find your WhatsApp Group or Channel invitation link anytime from your <a href="{{order_url}}" style="color: #5B2A5F;">Order Details</a> page.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    enabled: true,
    version: 1,
    published_version: 1,
    published_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your WhatsApp Invitation Link</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #3D183F; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Your WhatsApp invitation link is ready</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, your purchase of <strong>{{listing_name}}</strong> (order <strong>{{order_id}}</strong>) is confirmed. Use the verified WhatsApp invitation link below to join the Group or Channel.
        </p>
        
        <div style="background-color: #FAF5FA; border: 1px solid #D6B36A; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #706873; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 0; margin-bottom: 12px;">Verified Invitation Link</p>
          <a href="{{access_url}}" style="background-color: #26845A; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 700; display: inline-block;">Join {{listing_name}} on WhatsApp</a>
          <p style="font-size: 12px; color: #706873; margin-top: 14px; margin-bottom: 0;">Direct URL: <a href="{{access_url}}" style="color: #5B2A5F; word-break: break-all;">{{access_url}}</a></p>
        </div>

        <p style="font-size: 13px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          <strong>Security notice:</strong> This invitation link is unique to your purchase. Do not share or forward this link.
        </p>

        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          You can also find your WhatsApp Group or Channel invitation link anytime from your <a href="{{order_url}}" style="color: #5B2A5F;">Order Details</a> page.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    published_subject: "Your WhatsApp Invitation Link for {{listing_name}} — THEEYA'S DELUXE HUB",
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-payment-failed',
    event_key: 'payment.failed',
    name: 'Payment Issue Notice',
    subject: "Payment Notice for Order {{order_id}} — THEEYA'S DELUXE HUB",
    html_source: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Notice</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #C94A4A; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Payment Could Not Be Confirmed</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, we were unable to confirm payment for order <strong>{{order_id}}</strong> for <strong>{{listing_name}}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          If funds were deducted from your account, please reach out to our support team with your transaction reference. If you cancelled the transaction, you can create a new order at your convenience.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{tracking_url}}" style="background-color: #5B2A5F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Check Order Status</a>
        </div>
        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          Support email: {{support_email}}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    enabled: true,
    version: 1,
    published_version: 1,
    published_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Notice</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 24px; text-align: left; border-bottom: 2px solid #D6B36A;">
        <span style="color: #FCFAF6; font-size: 16px; font-weight: 700; letter-spacing: 0.05em;">THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h1 style="color: #C94A4A; font-size: 22px; margin-top: 0; margin-bottom: 12px; font-weight: 600;">Payment Could Not Be Confirmed</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          Hello {{customer_name}}, we were unable to confirm payment for order <strong>{{order_id}}</strong> for <strong>{{listing_name}}</strong>.
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #706873; margin-bottom: 24px;">
          If funds were deducted from your account, please reach out to our support team with your transaction reference. If you cancelled the transaction, you can create a new order at your convenience.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="{{tracking_url}}" style="background-color: #5B2A5F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Check Order Status</a>
        </div>
        <p style="font-size: 12px; color: #A09A9E; border-top: 1px solid #E8E2E8; padding-top: 16px; margin-bottom: 0;">
          Support email: {{support_email}}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    published_subject: "Payment Notice for Order {{order_id}} — THEEYA'S DELUXE HUB",
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
  {
    id: 'tmpl-admin-order-created',
    event_key: 'admin.order_created',
    name: 'Administrator New Order Alert',
    subject: "Admin Alert: New Order {{order_id}} for {{listing_name}}",
    html_source: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order Alert</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 20px; text-align: left;">
        <span style="color: #D6B36A; font-size: 14px; font-weight: 700; text-transform: uppercase;">ADMIN NOTIFICATION // THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <h2 style="color: #3D183F; font-size: 18px; margin-top: 0;">New Customer Order Placed</h2>
        <p style="font-size: 14px; color: #706873;">Order <strong>{{order_id}}</strong> has been submitted by <strong>{{customer_name}}</strong> ({{customer_email}} / WhatsApp: {{whatsapp_number}}).</p>
        <p style="font-size: 14px; color: #706873;">Listing: <strong>{{listing_name}}</strong> | Amount: <strong>{{currency}} {{amount}}</strong></p>
        <p style="font-size: 14px; color: #706873;">Payment Status: <strong>{{payment_status}}</strong></p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    enabled: true,
    version: 1,
    published_version: 1,
    published_html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Order Alert</title>
</head>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #FCFAF6; margin: 0; padding: 32px 16px; color: #211F23;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E8E2E8; overflow: hidden;">
    <tr>
      <td style="background-color: #3D183F; padding: 20px; text-align: left;">
        <span style="color: #D6B36A; font-size: 14px; font-weight: 700; text-transform: uppercase;">ADMIN NOTIFICATION // THEEYA'S DELUXE HUB</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px;">
        <h2 style="color: #3D183F; font-size: 18px; margin-top: 0;">New Customer Order Placed</h2>
        <p style="font-size: 14px; color: #706873;">Order <strong>{{order_id}}</strong> has been submitted by <strong>{{customer_name}}</strong> ({{customer_email}} / WhatsApp: {{whatsapp_number}}).</p>
        <p style="font-size: 14px; color: #706873;">Listing: <strong>{{listing_name}}</strong> | Amount: <strong>{{currency}} {{amount}}</strong></p>
        <p style="font-size: 14px; color: #706873;">Payment Status: <strong>{{payment_status}}</strong></p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    published_subject: "Admin Alert: New Order {{order_id}} for {{listing_name}}",
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  },
];

class Database {
  private data: StoreData;
  private baseData: StoreData | null = null;

  constructor() {
    this.data = this.load();
    this.baseData = cloneState(this.data);
  }

  private load(): StoreData {
    if (remoteStateConfigured()) {
      const remote = remoteRequest();
      if (Array.isArray(remote) && remote[0]?.state) {
        console.log('[Supabase] Loaded durable application state.');
        return remote[0].state as StoreData;
      }
      if (remote === null || (Array.isArray(remote) && remote.length > 0)) {
        throw new Error('Durable Supabase application state could not be read; refusing to initialize or overwrite production data.');
      }
      console.info('[Supabase] No durable application state row exists; initializing the first store snapshot.');
    }

    try {
      if (!remoteStateConfigured() && fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load store, initializing default:', err);
    }

    const initial: StoreData = {
      profiles: [],
      bootstrap: {
        claimed: false,
        owner_id: null,
        claimed_at: null,
      },
      admin_invites: [],
      categories: defaultCategories,
      listings: defaultListings,
      private_links: defaultPrivateLinks,
      orders: [],
      fulfillments: [],
      transactions: [],
      provider_config: {
        key: 'paystack',
        name: 'Paystack',
        enabled: true,
        environment: 'test',
        subaccount_code: '',
        split_code: '',
        fee_bearer: 'account',
        has_secret: !!process.env.PAYSTACK_SECRET_KEY,
        last_tested_at: null,
      },
      email_templates: defaultEmailTemplates,
      email_outbox: [],
      email_logs: [],
      audit_logs: [
        {
          id: 'audit-init',
          actor_email: 'system',
          action: 'store.initialized',
          entity_type: 'system',
          entity_id: 'tdh-core',
          details: 'TDH store initialized with starter categories, listings, and templates',
          timestamp: new Date().toISOString(),
        },
      ],
      settings: {
        store_name: "Theeya's Deluxe Hub",
        support_email: 'support@theeyasdeluxehub.com',
        support_whatsapp: '+2348000000000',
        currency: 'NGN',
        canonical_url: process.env.APP_URL || 'https://theeyadeluxehub.vercel.app',
        brevo_sender_email: process.env.BREVO_SENDER_EMAIL || 'notifications@theeyasdeluxehub.com',
        brevo_sender_name: process.env.BREVO_SENDER_NAME || "Theeya's Deluxe Hub",
        brevo_reply_to: process.env.BREVO_REPLY_TO || 'support@theeyasdeluxehub.com',
      },
    };

    this.save(initial);
    return initial;
  }

  refreshFromRemote(): boolean {
    if (!remoteStateConfigured()) {
      console.warn('[Realtime] Durable state is not configured; catalog cannot reconcile.');
      return false;
    }
    const remote = remoteRequest();
    if (!Array.isArray(remote) || !remote[0]?.state) {
      console.warn('[Realtime] Durable state read returned no store row.');
      return false;
    }
    const next = remote[0].state as StoreData;
    const changed = JSON.stringify(this.data) !== JSON.stringify(next);
    if (changed) this.data = next;
    this.baseData = cloneState(next);
    console.info('[Realtime] Catalog reconciliation completed:', {
      changed,
      remoteUpdatedAt: remote[0].updated_at || null,
      version: this.getPublicCatalogVersion(),
    });
    return changed;
  }

  getPublicCatalogVersion(): string {
    return crypto.createHash('sha256').update(JSON.stringify({
      listings: this.getPublicListings(),
      categories: this.getCategories().filter((category) => category.active),
    })).digest('hex');
  }

  private save(data = this.data): void {
    if (remoteStateConfigured()) {
      const intended = cloneState(data);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const remote = remoteRequest();
        if (!Array.isArray(remote)) {
          throw new Error('Durable Supabase state could not be read before saving; refusing to overwrite production data.');
        }
        const current = remote[0];
        if (!current?.state) {
          if (this.baseData) {
            throw new Error('Durable Supabase state disappeared; refusing to recreate it from a stale instance.');
          }
          const inserted = writeRemoteState(intended);
          if (Array.isArray(inserted) && inserted[0]?.updated_at) {
            this.data = intended;
            this.baseData = cloneState(this.data);
            return;
          }
          if (Array.isArray(inserted) && inserted.length === 0) continue;
          throw new Error('Durable Supabase persistence failed; refusing to continue with ephemeral-only writes.');
        }

        const merged = this.baseData
          ? mergeState(this.baseData, intended, current.state) as StoreData
          : cloneState(current.state as StoreData);
        const written = writeRemoteState(merged, current.updated_at);
        if (Array.isArray(written) && written[0]?.updated_at) {
          this.data = merged;
          this.baseData = cloneState(this.data);
          return;
        }
        if (Array.isArray(written) && written.length === 0) continue;
        throw new Error('Durable Supabase persistence failed; refusing to continue with ephemeral-only writes.');
      }
      throw new Error('Durable Supabase state changed repeatedly while saving. Please retry the update.');
    }

    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      throw new Error('Supabase service-role configuration is required in production. Local JSON fallback is disabled.');
    }

    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save store:', err);
      throw err;
    }
  }

  // --- Bootstrap & Auth ---
  getBootstrapState(): BootstrapState {
    return this.data.bootstrap;
  }

  claimBootstrap(ownerEmail: string, displayName: string): Profile {
    if (this.data.bootstrap.claimed) {
      throw new Error('Initial owner bootstrap has already been claimed.');
    }

    const ownerId = 'usr-owner-' + crypto.randomUUID().slice(0, 8);
    const profile: Profile = {
      id: ownerId,
      email: ownerEmail.toLowerCase().trim(),
      display_name: displayName.trim() || 'Owner',
      role: 'owner',
      created_at: new Date().toISOString(),
    };

    this.data.profiles.push(profile);
    this.data.bootstrap = {
      claimed: true,
      owner_id: ownerId,
      claimed_at: new Date().toISOString(),
    };

    this.addAuditLog(ownerEmail, 'bootstrap.claimed', 'profile', ownerId, 'Initial owner account claimed');
    this.save();
    return profile;
  }

  getProfileByEmail(email: string): Profile | undefined {
    return this.data.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  }

  getProfileById(id: string): Profile | undefined {
    return this.data.profiles.find((p) => p.id === id);
  }

  getAllProfiles(): Profile[] {
    return this.data.profiles;
  }

  deleteProfileByEmail(email: string): void {
    const normalized = email.trim().toLowerCase();
    const remaining = this.data.profiles.filter((profile) => profile.email.toLowerCase() !== normalized);
    if (remaining.length !== this.data.profiles.length) {
      this.data.profiles = remaining;
      this.save();
    }
  }

  createOrUpdateCustomer(email: string, displayName: string): Profile {
    const existing = this.getProfileByEmail(email);
    if (existing) {
      return existing;
    }
    const profile: Profile = {
      id: 'usr-' + crypto.randomUUID().slice(0, 8),
      email: email.toLowerCase().trim(),
      display_name: displayName.trim() || email.split('@')[0],
      role: 'customer',
      created_at: new Date().toISOString(),
    };
    this.data.profiles.push(profile);
    this.save();
    return profile;
  }

  createAdminInvite(email: string, createdBy: string): { invite: AdminInvite; token: string } {
    const token = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite: AdminInvite = {
      id: 'inv-' + crypto.randomUUID().slice(0, 8),
      token_hash: tokenHash,
      email: email.toLowerCase().trim(),
      created_by: createdBy,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days
      redeemed_at: null,
      revoked_at: null,
      created_at: new Date().toISOString(),
    };
    this.data.admin_invites.push(invite);
    this.addAuditLog(createdBy, 'admin_invite.created', 'admin_invite', invite.id, `Invite created for ${email}`);
    this.save();
    return { invite, token };
  }

  redeemAdminInvite(token: string, email: string, displayName: string): Profile {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = this.data.admin_invites.find(
      (inv) => inv.token_hash === tokenHash && !inv.redeemed_at && !inv.revoked_at
    );

    if (!invite) {
      throw new Error('Invitation is invalid, already redeemed, or revoked.');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error('Invitation token has expired.');
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error(`This invitation is reserved for ${invite.email}.`);
    }

    invite.redeemed_at = new Date().toISOString();

    let profile = this.getProfileByEmail(email);
    if (profile) {
      profile.role = 'admin';
    } else {
      profile = {
        id: 'usr-admin-' + crypto.randomUUID().slice(0, 8),
        email: email.toLowerCase().trim(),
        display_name: displayName.trim() || email.split('@')[0],
        role: 'admin',
        created_at: new Date().toISOString(),
      };
      this.data.profiles.push(profile);
    }

    this.addAuditLog(email, 'admin_invite.redeemed', 'profile', profile.id, 'Admin invitation redeemed');
    this.save();
    return profile;
  }

  revokeAdminInvite(inviteId: string, actorEmail: string): void {
    const invite = this.data.admin_invites.find((i) => i.id === inviteId);
    if (invite) {
      invite.revoked_at = new Date().toISOString();
      this.addAuditLog(actorEmail, 'admin_invite.revoked', 'admin_invite', inviteId, 'Admin invite revoked');
      this.save();
    }
  }

  getAdminInvites(): AdminInvite[] {
    return this.data.admin_invites;
  }

  // --- Categories ---
  getCategories(): Category[] {
    return this.data.categories;
  }

  getCategoryBySlug(slug: string): Category | undefined {
    return this.data.categories.find((c) => c.slug === slug);
  }

  saveCategory(cat: Omit<Category, 'id'> & { id?: string }, actorEmail: string): Category {
    if (cat.id) {
      const idx = this.data.categories.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        this.data.categories[idx] = { ...this.data.categories[idx], ...cat };
        this.addAuditLog(actorEmail, 'category.updated', 'category', cat.id, `Updated category ${cat.name}`);
        this.save();
        return this.data.categories[idx];
      }
    }
    const newCat: Category = {
      id: 'cat-' + crypto.randomUUID().slice(0, 8),
      slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: cat.name,
      icon: cat.icon || 'Folder',
      description: cat.description || '',
      sort_order: cat.sort_order || this.data.categories.length + 1,
      active: cat.active ?? true,
    };
    this.data.categories.push(newCat);
    this.addAuditLog(actorEmail, 'category.created', 'category', newCat.id, `Created category ${newCat.name}`);
    this.save();
    return newCat;
  }

  deleteCategory(id: string, actorEmail: string): boolean {
    const count = this.data.listings.filter((l) => l.category_id === id).length;
    if (count > 0) {
      throw new Error(`Cannot delete category with ${count} assigned listings. Archive or reassign first.`);
    }
    const idx = this.data.categories.findIndex((c) => c.id === id);
    if (idx >= 0) {
      this.data.categories.splice(idx, 1);
      this.addAuditLog(actorEmail, 'category.deleted', 'category', id, 'Deleted category');
      this.save();
      return true;
    }
    return false;
  }

  // --- Listings (PUBLIC SAFE) ---
  getPublicListings(): Listing[] {
    return this.data.listings.filter((l) => l.status === 'published' && l.availability === 'available');
  }

  getAllListings(): Listing[] {
    return this.data.listings;
  }

  getListingBySlug(slug: string): Listing | undefined {
    return this.data.listings.find((l) => l.slug === slug && l.status === 'published' && l.availability === 'available');
  }

  getListingById(id: string): Listing | undefined {
    return this.data.listings.find((l) => l.id === id);
  }

  private removeListingFromInventory(id: string, actorEmail: string): boolean {
    const idx = this.data.listings.findIndex((l) => l.id === id);
    if (idx < 0) return false;
    this.data.listings.splice(idx, 1);
    this.data.private_links = this.data.private_links.filter((p) => p.listing_id !== id);
    this.addAuditLog(actorEmail, 'listing.deleted', 'listing', id, 'Permanently removed one-time listing after successful fulfillment');
    return true;
  }

  getListingPrivateLink(listingId: string): ListingPrivateLink | undefined {
    return this.data.private_links.find((p) => p.listing_id === listingId);
  }

  saveListing(
    listingData: Partial<Listing> & { id?: string },
    privateLinkData?: { internal_source_url?: string; customer_access_url?: string },
    actorEmail: string = 'system'
  ): Listing {
    let listing: Listing;
    const now = new Date().toISOString();

    if (listingData.id) {
      const idx = this.data.listings.findIndex((l) => l.id === listingData.id);
      if (idx < 0) throw new Error('Listing not found');
      this.data.listings[idx] = {
        ...this.data.listings[idx],
        ...listingData,
        updated_at: now,
      };
      listing = this.data.listings[idx];
      this.addAuditLog(actorEmail, 'listing.updated', 'listing', listing.id, `Updated listing ${listing.name}`);
    } else {
      const id = 'lst-' + crypto.randomUUID().slice(0, 8);
      listing = {
        id,
        slug:
          listingData.slug ||
          (listingData.name || 'listing')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') +
            '-' +
            crypto.randomUUID().slice(0, 4),
        name: listingData.name || 'Untitled Listing',
        description: listingData.description || '',
        image_url:
          listingData.image_url ||
          'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=1200&q=80',
        type: listingData.type || 'group',
        category_id: listingData.category_id || (this.data.categories[0]?.id || 'cat-tech'),
        price_ngn: Number(listingData.price_ngn) || 10000,
        status: listingData.status || 'draft',
        availability: listingData.availability || 'available',
        featured: listingData.featured || false,
        fulfillment_mode: listingData.fulfillment_mode || 'automatic',
        created_at: now,
        updated_at: now,
      };
      this.data.listings.push(listing);
      this.addAuditLog(actorEmail, 'listing.created', 'listing', listing.id, `Created listing ${listing.name}`);
    }

    if (privateLinkData && (privateLinkData.customer_access_url || privateLinkData.internal_source_url)) {
      const pIdx = this.data.private_links.findIndex((p) => p.listing_id === listing.id);
      const linkEntry: ListingPrivateLink = {
        listing_id: listing.id,
        internal_source_url: privateLinkData.internal_source_url || '',
        customer_access_url: privateLinkData.customer_access_url || '',
        updated_by: actorEmail,
        updated_at: now,
      };
      if (pIdx >= 0) {
        this.data.private_links[pIdx] = linkEntry;
      } else {
        this.data.private_links.push(linkEntry);
      }
    }

    this.save();
    return listing;
  }

  deleteListing(id: string, actorEmail: string): boolean {
    if (this.removeListingFromInventory(id, actorEmail)) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Orders ---
  createOrder(params: {
    listing: Listing;
    customer_name: string;
    customer_email: string;
    whatsapp_number: string;
    user_id?: string | null;
  }): { order: Order; tracking_token: string } {
    const orderNumber = 'TDH-' + Math.floor(100000 + Math.random() * 900000);
    const trackingToken = crypto.randomBytes(16).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(trackingToken).digest('hex');

    const category = this.data.categories.find((c) => c.id === params.listing.category_id);
    const now = new Date().toISOString();

    const order: Order = {
      id: 'ord-' + crypto.randomUUID().slice(0, 8),
      order_number: orderNumber,
      user_id: params.user_id || null,
      customer_name: params.customer_name.trim(),
      customer_email: params.customer_email.toLowerCase().trim(),
      whatsapp_number: params.whatsapp_number.trim(),
      listing_id: params.listing.id,
      listing_snapshot: {
        id: params.listing.id,
        name: params.listing.name,
        type: params.listing.type,
        category_name: category?.name || 'General',
        price_ngn: params.listing.price_ngn,
        fulfillment_mode: params.listing.fulfillment_mode,
      },
      amount_kobo: params.listing.price_ngn * 100,
      currency: 'NGN',
      payment_status: 'pending',
      order_status: 'pending_payment',
      tracking_token_hash: tokenHash,
      created_at: now,
      updated_at: now,
      paid_at: null,
      completed_at: null,
    };

    this.data.orders.push(order);
    this.addAuditLog(
      params.customer_email,
      'order.created',
      'order',
      order.id,
      `Order ${order.order_number} created for ${params.listing.name}`
    );
    this.save();
    return { order, tracking_token: trackingToken };
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find((o) => o.id === id || o.order_number === id);
  }

  getAllOrders(): Order[] {
    return this.data.orders;
  }

  deleteOrder(id: string, actorEmail: string): boolean {
    const order = this.getOrderById(id);
    if (!order) return false;
    this.data.orders = this.data.orders.filter((item) => item.id !== order.id);
    this.data.fulfillments = this.data.fulfillments.filter((item) => item.order_id !== order.id);
    this.data.transactions = this.data.transactions.filter((item) => item.order_id !== order.id);
    this.data.email_outbox = this.data.email_outbox.filter((item) => item.order_id !== order.id);
    this.data.email_logs = this.data.email_logs.filter((item) => item.order_id !== order.id);
    this.addAuditLog(actorEmail, 'order.deleted', 'order', order.id, `Owner permanently deleted order ${order.order_number} and related operational records`);
    this.save();
    return true;
  }

  getOrderFulfillment(orderId: string): OrderFulfillment | undefined {
    return this.data.fulfillments.find((f) => f.order_id === orderId);
  }

  verifyOrderTracking(orderId: string, emailOrToken: string): Order | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const trimmed = emailOrToken.trim();
    if (order.customer_email.toLowerCase() === trimmed.toLowerCase()) {
      return order;
    }

    const tokenHash = crypto.createHash('sha256').update(trimmed).digest('hex');
    if (order.tracking_token_hash === tokenHash) {
      return order;
    }

    return null;
  }

  markOrderPaid(orderId: string, transactionReference: string): { order: Order; autoFulfilled: boolean; changed: boolean } {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (order.payment_status === 'paid') {
      return { order, autoFulfilled: order.order_status === 'completed', changed: false };
    }

    const now = new Date().toISOString();
    order.payment_status = 'paid';
    order.order_status = 'paid';
    order.paid_at = now;
    order.updated_at = now;

    let autoFulfilled = false;
    const listing = this.getListingById(order.listing_id);
    const privateLink = this.getListingPrivateLink(order.listing_id);

    // Rule 9 & 11.8: Automatic fulfillment if configured and valid link exists
    if (listing?.fulfillment_mode === 'automatic' && privateLink?.customer_access_url) {
      order.order_status = 'completed';
      order.completed_at = now;

      const fulfillment: OrderFulfillment = {
        order_id: order.id,
        access_url: privateLink.customer_access_url,
        fulfilled_by: 'system:automatic',
        fulfilled_at: now,
        notes: 'Automatic instant fulfillment via verified Paystack payment',
      };
      const existingFulfillmentIdx = this.data.fulfillments.findIndex((f) => f.order_id === order.id);
      if (existingFulfillmentIdx >= 0) {
        this.data.fulfillments[existingFulfillmentIdx] = fulfillment;
      } else {
        this.data.fulfillments.push(fulfillment);
      }
      // Preserve the order snapshot and fulfillment record, but remove the
      // one-time listing and private link from all future inventory queries.
      this.removeListingFromInventory(order.listing_id, 'system:automatic');
      autoFulfilled = true;
    } else {
      order.order_status = 'processing';
    }

    this.addAuditLog(
      'system:paystack',
      'payment.confirmed',
      'order',
      order.id,
      `Payment verified for ${order.order_number} ref: ${transactionReference}`
    );
    this.save();
    return { order, autoFulfilled, changed: true };
  }

  completeOrderManualFulfillment(orderId: string, accessUrl: string, actorEmail: string, notes?: string): Order {
    const order = this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

    if (order.payment_status !== 'paid') {
      throw new Error('Cannot complete fulfillment: Order payment is not verified as paid.');
    }

    if (!accessUrl || !accessUrl.startsWith('http')) {
      throw new Error('A valid WhatsApp URL (starting with http) is required.');
    }

    const now = new Date().toISOString();
    order.order_status = 'completed';
    order.completed_at = now;
    order.updated_at = now;

    const fulfillment: OrderFulfillment = {
      order_id: order.id,
      access_url: accessUrl.trim(),
      fulfilled_by: actorEmail,
      fulfilled_at: now,
      notes: notes || 'Admin manual fulfillment',
    };

    const existingFulfillmentIdx = this.data.fulfillments.findIndex((f) => f.order_id === order.id);
    if (existingFulfillmentIdx >= 0) {
      this.data.fulfillments[existingFulfillmentIdx] = fulfillment;
    } else {
      this.data.fulfillments.push(fulfillment);
    }

    this.removeListingFromInventory(order.listing_id, actorEmail);

    this.addAuditLog(actorEmail, 'order.fulfilled', 'order', order.id, `Manual fulfillment completed by ${actorEmail}`);
    this.save();
    return order;
  }

  // --- Transactions ---
  recordTransaction(tx: Omit<PaymentTransaction, 'id' | 'created_at'>): PaymentTransaction {
    const existing = this.getTransactionByReference(tx.reference);
    if (existing) {
      if (existing.order_id !== tx.order_id) throw new Error('Payment reference is already assigned to another order.');
      return existing;
    }
    const newTx: PaymentTransaction = {
      id: 'tx-' + crypto.randomUUID().slice(0, 8),
      created_at: new Date().toISOString(),
      ...tx,
    };
    this.data.transactions.push(newTx);
    this.save();
    return newTx;
  }

  markTransactionVerified(ref: string, providerReference?: string | null): PaymentTransaction | undefined {
    const tx = this.getTransactionByReference(ref);
    if (!tx) return undefined;
    tx.status = 'paid';
    tx.failure_reason = null;
    tx.provider_reference = providerReference || tx.provider_reference;
    tx.verified_at = tx.verified_at || new Date().toISOString();
    this.save();
    return tx;
  }

  getTransactionByReference(ref: string): PaymentTransaction | undefined {
    return this.data.transactions.find((t) => t.reference === ref);
  }

  getAllTransactions(): PaymentTransaction[] {
    return this.data.transactions;
  }

  // --- Provider Config ---
  getProviderConfig(): PaymentProviderConfig {
    return this.data.provider_config;
  }

  updateProviderConfig(updates: Partial<PaymentProviderConfig>, actorEmail: string): PaymentProviderConfig {
    this.data.provider_config = {
      ...this.data.provider_config,
      ...updates,
      has_secret: !!(process.env.PAYSTACK_SECRET_KEY || updates.has_secret),
    };
    this.addAuditLog(actorEmail, 'provider.updated', 'provider', 'paystack', 'Updated Paystack provider settings');
    this.save();
    return this.data.provider_config;
  }

  // --- Email Templates & Outbox ---
  getEmailTemplates(): EmailTemplate[] {
    return this.data.email_templates;
  }

  getEmailTemplateById(id: string): EmailTemplate | undefined {
    return this.data.email_templates.find((t) => t.id === id);
  }

  getEmailTemplateByEvent(eventKey: string): EmailTemplate | undefined {
    return this.data.email_templates.find((t) => t.event_key === eventKey && t.enabled);
  }

  saveEmailTemplate(
    templateId: string,
    data: { name?: string; subject?: string; html_source?: string; enabled?: boolean },
    actorEmail: string
  ): EmailTemplate {
    const template = this.getEmailTemplateById(templateId);
    if (!template) throw new Error('Email template not found');

    if (data.name !== undefined) template.name = data.name;
    if (data.subject !== undefined) template.subject = data.subject;
    if (data.html_source !== undefined) template.html_source = data.html_source;
    if (data.enabled !== undefined) template.enabled = data.enabled;
    template.version += 1;
    template.updated_at = new Date().toISOString();

    this.addAuditLog(actorEmail, 'email_template.draft_saved', 'email_template', template.id, `Saved draft v${template.version}`);
    this.save();
    return template;
  }

  publishEmailTemplate(templateId: string, actorEmail: string): EmailTemplate {
    const template = this.getEmailTemplateById(templateId);
    if (!template) throw new Error('Email template not found');

    template.published_version = template.version;
    template.published_html = template.html_source;
    template.published_subject = template.subject;
    template.published_at = new Date().toISOString();

    this.addAuditLog(actorEmail, 'email_template.published', 'email_template', template.id, `Published template version ${template.published_version}`);
    this.save();
    return template;
  }

  rollbackEmailTemplate(templateId: string, actorEmail: string): EmailTemplate {
    const template = this.getEmailTemplateById(templateId);
    if (!template) throw new Error('Email template not found');

    template.html_source = template.published_html;
    template.subject = template.published_subject;
    template.version = template.published_version;
    template.updated_at = new Date().toISOString();

    this.addAuditLog(actorEmail, 'email_template.rollback', 'email_template', template.id, `Restored published v${template.published_version}`);
    this.save();
    return template;
  }

  enqueueEmailJob(jobData: {
    event_key: string;
    order_id: string | null;
    recipient: string;
    template_id: string;
    template_version: number;
    rendered_subject: string;
    rendered_html: string;
    idempotency_key: string;
  }): EmailOutboxJob {
    const existing = this.data.email_outbox.find((j) => j.idempotency_key === jobData.idempotency_key);
    if (existing) {
      return existing;
    }

    const job: EmailOutboxJob = {
      id: 'job-' + crypto.randomUUID().slice(0, 8),
      idempotency_key: jobData.idempotency_key,
      event_key: jobData.event_key,
      order_id: jobData.order_id,
      template_id: jobData.template_id,
      template_version: jobData.template_version,
      recipient: jobData.recipient,
      rendered_subject: jobData.rendered_subject,
      rendered_html: jobData.rendered_html,
      status: 'queued',
      attempts: 0,
      max_attempts: 4,
      next_retry_at: new Date().toISOString(),
      brevo_message_id: null,
      error_message: null,
      created_at: new Date().toISOString(),
      sent_at: null,
    };

    this.data.email_outbox.push(job);
    this.save();
    return job;
  }

  getEmailOutbox(): EmailOutboxJob[] {
    return this.data.email_outbox;
  }

  deleteEmailJob(id: string, actorEmail: string): boolean {
    const index = this.data.email_outbox.findIndex((job) => job.id === id);
    if (index < 0) return false;
    const [job] = this.data.email_outbox.splice(index, 1);
    this.addAuditLog(actorEmail, 'email_outbox.deleted', 'email_outbox', id, `Owner permanently deleted ${job.event_key} email job`);
    this.save();
    return true;
  }

  getEmailLogs(): EmailLogEntry[] {
    return this.data.email_logs;
  }

  recordEmailLog(entry: Omit<EmailLogEntry, 'id' | 'timestamp'>): EmailLogEntry {
    const log: EmailLogEntry = {
      id: 'log-' + crypto.randomUUID().slice(0, 8),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.email_logs.unshift(log);
    // Keep max 500 logs
    if (this.data.email_logs.length > 500) {
      this.data.email_logs = this.data.email_logs.slice(0, 500);
    }
    this.save();
    return log;
  }

  updateEmailJob(jobId: string, updates: Partial<EmailOutboxJob>): void {
    const job = this.data.email_outbox.find((j) => j.id === jobId);
    if (job) {
      Object.assign(job, updates);
      this.save();
    }
  }

  // --- Audit Logs ---
  addAuditLog(actor_email: string, action: string, entity_type: string, entity_id: string, details: string): void {
    const entry: AuditLogEntry = {
      id: 'aud-' + crypto.randomUUID().slice(0, 8),
      actor_email,
      action,
      entity_type,
      entity_id,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(entry);
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 500);
    }
  }

  getAuditLogs(): AuditLogEntry[] {
    return this.data.audit_logs;
  }

  // --- Store Settings ---
  getSettings(): StoreSettings {
    return process.env.APP_URL ? { ...this.data.settings, canonical_url: process.env.APP_URL } : this.data.settings;
  }

  updateSettings(updates: Partial<StoreSettings>, actorEmail: string): StoreSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.addAuditLog(actorEmail, 'settings.updated', 'store_settings', 'global', 'Updated general settings');
    this.save();
    return this.data.settings;
  }
}

export const db = new Database();
