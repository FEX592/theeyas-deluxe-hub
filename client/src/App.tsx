import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  CreditCard,
  ChevronDown,
  Clipboard,
  Copy,
  Crown,
  ExternalLink,
  FileText,
  KeyRound,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { getAppServices, type AppServices } from "./lib/supabase";
import type { AdminInvite, Listing, Order, Profile } from "./lib/types";
import PaymentsSettings from "./PaymentsSettings";
import { CheckoutPage, HomePage, ListingDetailPage, MarketplacePage, PublicHeader, TrackOrderPage } from "./PublicPages";
import "./index.css";

const CANONICAL_SITE_URL = "https://theeyadeluxehub.vercel.app";

const navItems = [
  { id: "marketplace", label: "Marketplace" },
  { id: "how-it-works", label: "How it works" },
  { id: "track-order", label: "Track order" },
];

const statusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  pending: "Waiting for payment",
  processing: "Processing",
  completed: "Ready",
  failed: "Payment not completed",
  success: "Payment confirmed",
};

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`} aria-label="THEEYA’S DELUXE HUB">
      <div className="brand-symbol"><Crown size={compact ? 12 : 14} fill="currentColor" /></div>
      <div className="brand-monogram"><span>T</span><span>D</span><span>H</span></div>
      {!compact && <div className="brand-copy"><strong>THEEYA’S</strong><small>DELUXE HUB</small></div>}
    </div>
  );
}

function Button({ children, variant = "primary", icon, type = "button", disabled = false, onClick, className = "" }: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger" | "gold";
  icon?: ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return <button type={type} className={`button button-${variant} ${className}`} disabled={disabled} onClick={onClick}>{children}{icon}</button>;
}

function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-${value}`}>{statusLabels[value] ?? value}</span>;
}

function Notice({ kind = "info", children, onClose }: { kind?: "info" | "success" | "error"; children: ReactNode; onClose?: () => void }) {
  return <div className={`notice notice-${kind}`} role="status"><span>{children}</span>{onClose && <button className="notice-close" onClick={onClose} aria-label="Dismiss"><X size={14} /></button>}</div>;
}

function App() {
  const [services, setServices] = useState<AppServices | null>(null);
  const [bootError, setBootError] = useState("");
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get("invite") || "");
  const [paymentReference, setPaymentReference] = useState(() => new URLSearchParams(window.location.search).get("reference") || "");

  useEffect(() => {
    getAppServices().then(setServices).catch((error: Error) => {
      setBootError(error.message);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!services) return;
    let mounted = true;
    services.supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });
    const { data: authListener } = services.supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      if (!nextSession) setProfile(null);
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [services]);

  useEffect(() => {
    if (!services || !session) return;
    let mounted = true;
    services.supabase.from("profiles").select("id,email,display_name,role,created_at").eq("id", session.user.id).maybeSingle().then(({ data }) => {
      if (mounted) setProfile((data as Profile | null) ?? null);
    });
    return () => { mounted = false; };
  }, [services, session]);

  useEffect(() => {
    if (!services || !session || !inviteToken) return;
    services.supabase.rpc("redeem_admin_invite", { invite_token: inviteToken }).then(({ data, error }) => {
      if (!error && data?.success) {
        setNotice({ kind: "success", text: "Admin access has been added to your account." });
        services.supabase.from("profiles").select("id,email,display_name,role,created_at").eq("id", session.user.id).maybeSingle().then(({ data: refreshed }) => setProfile((refreshed as Profile | null) ?? null));
      } else if (error) {
        setNotice({ kind: "error", text: error.message });
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("invite");
      window.history.replaceState({}, "", url.toString());
      setInviteToken("");
    });
  }, [services, session, inviteToken]);

  useEffect(() => {
    if (!services || !session || !paymentReference) return;
    fetch(`/api/payments/verify?reference=${encodeURIComponent(paymentReference)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.status === "paid") setNotice({ kind: "success", text: "Payment confirmed. Your order is being processed." });
      else if (response.ok && ["pending", "processing", "unknown"].includes(payload.status)) setNotice({ kind: "info", text: "Payment is still being confirmed. Check your order status shortly." });
      else setNotice({ kind: "error", text: payload.error || (payload.status === "cancelled" ? "Payment was cancelled." : payload.status === "expired" ? "Payment session expired." : "Payment could not be completed.") });
    }).catch(() => {
      setNotice({ kind: "info", text: "Payment is still being confirmed. Check your order status shortly." });
    }).finally(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("reference");
      window.history.replaceState({}, "", url.toString());
      setPaymentReference("");
    });
  }, [services, session, paymentReference]);

  if (isLoading) return <LoadingScreen label="Loading account" />;
  if (bootError) return <ConfigurationScreen message={bootError} />;
  if (!services) return <LoadingScreen label="Preparing site" />;
  return <BrowserRouter><ApplicationRoutes services={services} session={session} profile={profile} inviteToken={inviteToken} notice={notice} setNotice={setNotice} setSession={setSession} /></BrowserRouter>;
}

function ApplicationRoutes({ services, session, profile, inviteToken, notice, setNotice, setSession }: { services: AppServices; session: any; profile: Profile | null; inviteToken: string; notice: { kind: "info" | "success" | "error"; text: string } | null; setNotice: (notice: { kind: "info" | "success" | "error"; text: string } | null) => void; setSession: (session: any) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = async () => { await services.supabase.auth.signOut(); navigate("/"); };
  const onNotice = (next: { kind: "info" | "success" | "error"; text: string }) => setNotice(next);
  const publicProps = { services, profile, onSignOut: signOut, onNotice };
  return <div className="app-shell">{notice && <div className="global-notice"><Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice></div>}{!session ? <Routes><Route path="/" element={<HomePage {...publicProps} />} /><Route path="/marketplace" element={<MarketplacePage {...publicProps} />} /><Route path="/marketplace/:slug" element={<ListingDetailPage {...publicProps} />} /><Route path="/checkout/:listingId" element={<CheckoutPage {...publicProps} session={null} />} /><Route path="/track-order" element={<TrackOrderPage services={services} profile={null} />} /><Route path="/login" element={<AuthScreen services={services} inviteToken={inviteToken} onSignedIn={setSession} />} /><Route path="/signup" element={<AuthScreen services={services} inviteToken={inviteToken} onSignedIn={setSession} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes> : !profile ? <LoadingScreen label="Loading account permissions" /> : <Routes><Route path="/" element={<HomePage {...publicProps} />} /><Route path="/marketplace" element={<MarketplacePage {...publicProps} />} /><Route path="/marketplace/:slug" element={<ListingDetailPage {...publicProps} />} /><Route path="/checkout/:listingId" element={<CheckoutPage {...publicProps} session={session} />} /><Route path="/track-order" element={<TrackOrderPage services={services} profile={profile} onSignOut={signOut} />} /><Route path="/account" element={<SettingsView services={services} session={session} profile={profile} onBack={() => navigate("/")} onSignedOut={signOut} onNotice={onNotice} />} /><Route path="/account/security" element={<SettingsView services={services} session={session} profile={profile} onBack={() => navigate("/")} onSignedOut={signOut} onNotice={onNotice} />} /><Route path="/admin/*" element={profile.role === "admin" ? <AdminRoutes services={services} session={session} profile={profile} onNotice={onNotice} onBack={() => navigate("/")} /> : <Navigate to="/" replace />} /><Route path="/login" element={<Navigate to="/" replace />} /><Route path="/signup" element={<Navigate to="/" replace />} /><Route path="*" element={<Navigate to={location.pathname.startsWith("/admin") ? "/admin" : "/"} replace />} /></Routes>}</div>;
}

function AdminRoutes({ services, session, profile, onNotice, onBack }: { services: AppServices; session: any; profile: Profile; onNotice: (notice: { kind: "info" | "success" | "error"; text: string }) => void; onBack: () => void }) {
  return <Routes><Route index element={<AdminPanel services={services} session={session} profile={profile} initialSection="overview" onBack={onBack} onNotice={onNotice} />} /><Route path="listings" element={<AdminPanel services={services} session={session} profile={profile} initialSection="listings" onBack={onBack} onNotice={onNotice} />} /><Route path="orders" element={<AdminPanel services={services} session={session} profile={profile} initialSection="orders" onBack={onBack} onNotice={onNotice} />} /><Route path="payments" element={<AdminPanel services={services} session={session} profile={profile} initialSection="payments" onBack={onBack} onNotice={onNotice} />} /><Route path="admins" element={<AdminPanel services={services} session={session} profile={profile} initialSection="invites" onBack={onBack} onNotice={onNotice} />} /><Route path="settings" element={<AdminPanel services={services} session={session} profile={profile} initialSection="settings" onBack={onBack} onNotice={onNotice} />} /><Route path="*" element={<Navigate to="/admin" replace />} /></Routes>;
}

function LoadingScreen({ label }: { label: string }) {
  return <div className="center-screen"><div className="loading-orb"><RefreshCw size={20} /></div><p>{label}</p></div>;
}

function ConfigurationScreen({ message }: { message: string }) {
  return <div className="center-screen config-screen"><BrandLockup /><div className="config-card"><span className="eyebrow">SITE SETUP</span><h1>Connect the site before opening it.</h1><p>{message}</p><div className="config-list"><div><span>01</span><p>Add the Supabase URL and anon key to Vercel.</p></div><div><span>02</span><p>Run <code>supabase/schema.sql</code> in the Supabase SQL editor.</p></div><div><span>03</span><p>Add the the payment provider secret to Vercel before enabling checkout.</p></div></div></div></div>;
}

function AuthScreen({ services, inviteToken, onSignedIn }: { services: AppServices; inviteToken: string; onSignedIn: (session: any) => void }) {
  const location = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">(location.pathname === "/signup" || inviteToken ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setConfirmationPending(false);
    if (mode === "signup") {
      const { data, error } = await services.supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim(), invite_token: inviteToken || null } } });
      if (error) {
        setMessage({ kind: "error", text: error.message });
        if (/already registered|email not confirmed/i.test(error.message)) setConfirmationPending(true);
      }
      else if (data.session) onSignedIn(data.session);
      else {
        setConfirmationPending(true);
        setMessage({ kind: "success", text: "Check your email to confirm the account. If it doesn’t arrive, you can resend the confirmation email." });
      }
    } else {
      const { data, error } = await services.supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage({ kind: "error", text: error.message });
        if (error.message.toLowerCase().includes("email not confirmed")) setConfirmationPending(true);
      }
      else if (data.session) onSignedIn(data.session);
    }
    setBusy(false);
  };

  const resendConfirmation = async () => {
    if (busy || resendCooldown > 0 || !email.trim()) return;
    setBusy(true);
    setResendCooldown(60);
    try {
      const { error } = await services.supabase.auth.resend({ type: "signup", email: email.trim() });
      if (error) setMessage({ kind: "error", text: "We couldn’t send the email right now. Please wait a moment and try again." });
      else setMessage({ kind: "success", text: "If confirmation is still pending for this address, a new email will be sent. Check your inbox and spam folder." });
    } catch {
      setMessage({ kind: "error", text: "We couldn’t send the email right now. Please wait a moment and try again." });
    } finally {
      setBusy(false);
    }
  };

  return <div className="auth-layout">
    <aside className="auth-rail"><BrandLockup /><div className="auth-rail-copy"><span className="eyebrow">THEEYA’S DELUXE HUB</span><h1>Selected spaces.<br /><em>Clear access.</em></h1><p>Discover and purchase access to WhatsApp Groups and Channels.</p></div><div className="auth-rail-footer"><span className="gold-line" /> <span>Marketplace access is for signed-in users.</span></div></aside>
    <main className="auth-main"><div className="auth-panel">
      <div className="auth-panel-header"><span className="eyebrow">ACCOUNT ACCESS</span><div className="auth-tabs"><button className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setMessage(null); setConfirmationPending(false); }}>Sign in</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setMessage(null); setConfirmationPending(false); }}>Create account</button></div></div>
      {inviteToken && <Notice kind="success">Admin invite detected. Sign in or create an account to redeem it.</Notice>}
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {confirmationPending && <Button variant="outline" disabled={busy || !email.trim() || resendCooldown > 0} onClick={resendConfirmation}>{resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : "Resend confirmation email"}</Button>}
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && <Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="How the team should identify you" required />}
        <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" required minLength={8} />
        <Button type="submit" disabled={busy} className="full-width" icon={busy ? <RefreshCw className="spin" size={16} /> : <ArrowRight size={16} />}>{busy ? "Working" : mode === "signin" ? "Sign in" : "Create account"}</Button>
      </form>
      <p className="auth-footnote">By continuing, you use THEEYA’S DELUXE HUB’s own account system. Payment is handled through the payment provider when checkout is available.</p>
    </div></main>
  </div>;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, minLength }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean; minLength?: number }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} minLength={minLength} /></label>;
}

function SiteHeader({ profile, onAdmin, onSettings, onSignOut }: { profile: Profile; onAdmin: () => void; onSettings: () => void; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header"><a className="site-brand" href="#top"><BrandLockup compact /><span><strong>THEEYA’S</strong><small>DELUXE HUB</small></span></a><nav className={`site-nav ${menuOpen ? "open" : ""}`}>{navItems.map((item) => <a key={item.id} href={`#${item.id}`} onClick={() => setMenuOpen(false)}>{item.label}</a>)}{profile.role === "admin" && <button className="admin-nav-button" onClick={onAdmin}><LayoutDashboard size={14} /> Admin</button>}<button className="user-nav" onClick={onSettings}><span className="avatar">{initials(profile.display_name || profile.email || "U")}</span><span className="user-nav-name">{profile.display_name || profile.email?.split("@")[0]}</span><ChevronDown size={13} /></button><button className="signout-nav" onClick={onSignOut} aria-label="Sign out"><LogOut size={16} /></button></nav><button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Open navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></header>;
}

function Storefront({ services, session, profile, onAdmin, onSettings, onSignOut, onNotice }: { services: AppServices; session: any; profile: Profile; onAdmin: () => void; onSettings: () => void; onSignOut: () => void; onNotice: (notice: { kind: "info" | "success" | "error"; text: string }) => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [checkoutListing, setCheckoutListing] = useState<Listing | null>(null);
  const [trackId, setTrackId] = useState("");
  const [trackWhatsApp, setTrackWhatsApp] = useState("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackBusy, setTrackBusy] = useState(false);

  const loadListings = async () => {
    setLoading(true);
    const { data, error } = await services.supabase.from("published_listings").select("id,name,type,description,price,currency,category,status,created_at").order("created_at", { ascending: false });
    if (error) onNotice({ kind: "error", text: error.message });
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { loadListings(); }, [services]);

  const filtered = useMemo(() => listings.filter((item) => `${item.name} ${item.description} ${item.category ?? ""} ${item.type}`.toLowerCase().includes(query.toLowerCase())), [listings, query]);

  const trackOrder = async (event: FormEvent) => {
    event.preventDefault();
    setTrackBusy(true);
    setTrackedOrder(null);
    const { data, error } = await services.supabase.rpc("lookup_customer_order", { p_order_id: trackId.trim(), p_whatsapp_number: trackWhatsApp.trim() }).maybeSingle();
    if (error || !data) onNotice({ kind: "error", text: error?.message || "No order matched those details." });
    else setTrackedOrder(data as Order);
    setTrackBusy(false);
  };

  return <>
    <SiteHeader profile={profile} onAdmin={onAdmin} onSettings={onSettings} onSignOut={onSignOut} />
    <main id="top">
      <section className="hero-section page-width"><div className="hero-copy"><span className="eyebrow"><span className="eyebrow-line" /> WHATSAPP MARKETPLACE</span><h1>Discover WhatsApp communities <em>worth joining.</em></h1><p>Browse available WhatsApp Groups and Channels, choose what interests you, and purchase access through a simple checkout.</p><div className="hero-actions"><Button onClick={() => document.getElementById("marketplace")?.scrollIntoView({ behavior: "smooth" })} icon={<ArrowRight size={16} />}>Browse Marketplace</Button><a className="text-link" href="#how-it-works">How it works <ChevronDown size={15} /></a></div><div className="hero-meta"><span className="meta-dot" /> Payments are processed through the payment provider.</div></div><div className="hero-composition" aria-hidden="true"><div className="composition-ring ring-one" /><div className="composition-ring ring-two" /><div className="floating-label label-top"><MessageCircle size={15} /> WHATSAPP ACCESS</div><div className="composition-card"><div className="card-spark"><Sparkles size={18} /></div><div><strong>Find your next space</strong><span>Browse by what interests you</span></div><ArrowRight size={16} /></div><div className="composition-seal"><Crown size={16} fill="currentColor" /><span>TDH</span></div></div></section>
      <section className="trust-bar page-width"><TrustItem icon={<LockKeyhole size={17} />} title="Provider checkout" copy="Payments are processed through the payment provider." /><TrustItem icon={<Clipboard size={17} />} title="Clear order tracking" copy="Track with your Order ID and WhatsApp number." /><TrustItem icon={<PackageCheck size={17} />} title="Order processing" copy="Access is provided after the order is completed." /></section>
      <section id="marketplace" className="marketplace-section page-width"><div className="section-header"><div><span className="eyebrow"><span className="eyebrow-line" /> MARKETPLACE</span><h2>Available listings</h2></div><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search listings" /></div></div>{loading ? <div className="empty-panel"><RefreshCw className="spin" size={20} /><p>Loading listings</p></div> : filtered.length === 0 ? <div className="empty-panel"><ShoppingBag size={25} /><h3>No listings found</h3><p>Try another search or browse all categories.</p></div> : <div className="listing-grid">{filtered.map((item) => <ListingCard key={item.id} item={item} onBuy={() => setCheckoutListing(item)} />)}</div>}</section>
      <section id="how-it-works" className="process-section"><div className="page-width process-layout"><div className="process-copy"><span className="eyebrow"><span className="eyebrow-line" /> SIMPLE CHECKOUT</span><h2>From discovery<br /><em>to access.</em></h2><p>Choose a listing, complete payment through the payment provider, and track your order while it is processed.</p></div><div className="steps"><Step number="01" title="Choose a listing" copy="Browse available WhatsApp Groups and Channels." /><Step number="02" title="Complete payment" copy="You’ll be redirected to the payment provider to complete your payment." /><Step number="03" title="Track your order" copy="Use your Order ID and WhatsApp number to check progress." /></div></div></section>
      <section id="track-order" className="tracking-section page-width"><div className="tracking-card"><div className="tracking-copy"><span className="eyebrow"><span className="eyebrow-line" /> ORDER TRACKING</span><h2>Keep your order <em>in view.</em></h2><p>Track your order using the Order ID and WhatsApp number provided at checkout.</p></div><div className="tracking-form"><form onSubmit={trackOrder}><Field label="Order ID" value={trackId} onChange={setTrackId} placeholder="e.g. TDH-0001" required /><Field label="WhatsApp number" value={trackWhatsApp} onChange={setTrackWhatsApp} placeholder="Your WhatsApp number" required /><Button type="submit" disabled={trackBusy} className="full-width" icon={trackBusy ? <RefreshCw className="spin" size={16} /> : <ArrowRight size={16} />}>{trackBusy ? "Checking" : "Track Order"}</Button></form>{trackedOrder && <div className="tracked-result"><div className="result-icon"><Check size={17} /></div><div><strong>{statusLabels[trackedOrder.order_status]}</strong><span>{trackedOrder.order_status === "completed" && trackedOrder.access_link ? <a href={trackedOrder.access_link} target="_blank" rel="noreferrer">Open access link <ExternalLink size={13} /></a> : "Your order is being handled according to its current status."}</span></div></div>}</div></div></section>
    </main>
    <footer className="site-footer page-width"><BrandLockup compact /><span>Marketplace for WhatsApp Groups and Channels.</span><span className="footer-rule" /><button onClick={onSettings}>Account settings</button></footer>
    {checkoutListing && <CheckoutModal services={services} session={session} listing={checkoutListing} onClose={() => setCheckoutListing(null)} onNotice={onNotice} />}
  </>;
}

function TrustItem({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="trust-item"><div className="trust-icon">{icon}</div><div><strong>{title}</strong><span>{copy}</span></div></div>; }
function Step({ number, title, copy }: { number: string; title: string; copy: string }) { return <div className="step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></div>; }
function ListingCard({ item, onBuy }: { item: Listing; onBuy: () => void }) { return <article className="listing-card"><div className="listing-card-head"><span>{item.type}</span><span>{item.category || "General"}</span></div><div className="listing-card-icon"><MessageCircle size={19} /></div><h3>{item.name}</h3><p>{item.description}</p><div className="listing-card-bottom"><strong>{formatMoney(item.price, item.currency)}</strong><Button variant="outline" onClick={onBuy} icon={<ArrowRight size={14} />}>View listing</Button></div></article>; }

function CheckoutModal({ services, session, listing, onClose, onNotice }: { services: AppServices; session: any; listing: Listing; onClose: () => void; onNotice: (notice: { kind: "info" | "success" | "error"; text: string }) => void }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/api/payments/initialize", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ listingId: listing.id, whatsappNumber: whatsapp.trim() }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.checkoutUrl) setError(payload.error || "Checkout is not available right now.");
    else { onNotice({ kind: "info", text: "Redirecting to the payment provider." }); window.location.href = payload.checkoutUrl; }
    setBusy(false);
  };
  return <Modal onClose={onClose}><div className="modal-kicker"><ShoppingBag size={15} /> CHECKOUT</div><h2>{listing.name}</h2><p className="modal-intro">You’ll be redirected to the payment provider to complete your payment.</p><div className="checkout-summary"><span>{listing.type} · {listing.category || "General"}</span><strong>{formatMoney(listing.price, listing.currency)}</strong></div>{error && <Notice kind="error">{error}</Notice>}<form onSubmit={submit}><Field label="WhatsApp number" value={whatsapp} onChange={setWhatsapp} placeholder="The number for order updates" required /><Button type="submit" disabled={busy} className="full-width" icon={busy ? <RefreshCw className="spin" size={16} /> : <ArrowRight size={16} />}>{busy ? "Preparing payment" : "Continue to Payment"}</Button></form></Modal>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal-card" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>{children}</div></div>; }

function AdminPanel({ services, session, profile, initialSection = "overview", onBack, onNotice }: { services: AppServices; session: any; profile: Profile; initialSection?: "overview" | "listings" | "orders" | "invites" | "payments" | "settings"; onBack: () => void; onNotice: (notice: { kind: "info" | "success" | "error"; text: string }) => void }) {
  const navigate = useNavigate();
  const [section, setSection] = useState<"overview" | "listings" | "orders" | "invites" | "payments" | "settings">(initialSection);
  const [collapsed, setCollapsed] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [busy, setBusy] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const signOut = async () => {
    await services.supabase.auth.signOut();
    onBack();
  };

  const loadAdmin = async () => {
    setBusy(true);
    const [{ data: listingData, error: listingError }, { data: orderData, error: orderError }, { data: inviteData, error: inviteError }] = await Promise.all([
      services.supabase.rpc("admin_listing_snapshot"),
      services.supabase.rpc("admin_order_snapshot"),
      services.supabase.from("admin_invites").select("*").order("created_at", { ascending: false }),
    ]);
    const firstError = listingError || orderError || inviteError;
    if (firstError) onNotice({ kind: "error", text: firstError.message });
    setListings((listingData as Listing[]) ?? []);
    setOrders((orderData as Order[]) ?? []);
    setInvites((inviteData as AdminInvite[]) ?? []);
    setBusy(false);
  };
  useEffect(() => { setSection(initialSection); loadAdmin(); }, [services, initialSection]);

  const saveListing = async (draft: Partial<Listing>) => {
    const payload = { name: draft.name?.trim(), type: draft.type, description: draft.description?.trim(), price: Number(draft.price), currency: draft.currency || "₦", category: draft.category?.trim() || null, access_link: draft.access_link?.trim() || null, status: draft.status || "draft" };
    const result = draft.id ? await services.supabase.from("listings").update(payload).eq("id", draft.id) : await services.supabase.from("listings").insert(payload);
    if (result.error) onNotice({ kind: "error", text: result.error.message });
    else { onNotice({ kind: "success", text: draft.id ? "Listing updated." : "Listing saved." }); setSelectedListing(null); loadAdmin(); }
  };

  const deleteListing = async (id: string) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    const { error } = await services.supabase.from("listings").delete().eq("id", id);
    if (error) onNotice({ kind: "error", text: error.message }); else { onNotice({ kind: "success", text: "Listing deleted." }); loadAdmin(); }
  };

  const saveOrder = async (order: Order, orderStatus: Order["order_status"], accessLink: string) => {
    const { error } = await services.supabase.rpc("admin_update_order", { p_order_id: order.id, p_order_status: orderStatus, p_access_link: accessLink.trim() || null });
    if (error) onNotice({ kind: "error", text: error.message }); else { onNotice({ kind: "success", text: "Order updated." }); loadAdmin(); }
  };

  return <div className="admin-shell"><aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}><div className="admin-sidebar-top"><BrandLockup compact={!collapsed} /><button onClick={() => setCollapsed((value) => !value)} className="collapse-button" aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button></div><div className="admin-workspace-label">{!collapsed && <><span>WORKSPACE</span><strong>Deluxe Hub</strong></>}</div><nav className="admin-nav">{[{ id: "overview", path: "/admin", label: "Overview", icon: <BarChart3 size={17} /> }, { id: "listings", path: "/admin/listings", label: "Listings", icon: <FileText size={17} /> }, { id: "orders", path: "/admin/orders", label: "Orders", icon: <PackageCheck size={17} /> }, { id: "invites", path: "/admin/admins", label: "Admin invites", icon: <Users size={17} /> }, { id: "payments", path: "/admin/payments", label: "Payments", icon: <CreditCard size={17} /> }, { id: "settings", path: "/admin/settings", label: "Account settings", icon: <Settings size={17} /> }].map((item) => <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => navigate(item.path)} title={collapsed ? item.label : undefined}>{item.icon}{!collapsed && <span>{item.label}</span>}</button>)}</nav><button className="back-store" onClick={onBack}><ArrowRight size={16} />{!collapsed && "Back to storefront"}</button></aside><main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">ADMINISTRATION</span><h1>{section === "overview" ? "Good to see you, " : ""}{section === "overview" ? (profile.display_name || "administrator") : sectionTitle(section)}</h1></div><div className="admin-topbar-actions"><span className="admin-user-badge"><span className="avatar">{initials(profile.display_name || profile.email || "A")}</span>{profile.email}</span><Button variant="ghost" onClick={loadAdmin} icon={<RefreshCw size={15} />}>Refresh</Button></div></header>{busy ? <div className="admin-loading"><RefreshCw className="spin" size={19} /><span>Loading workspace data</span></div> : <div className="admin-content">{section === "overview" && <AdminOverview listings={listings} orders={orders} invites={invites} onSection={(next) => navigate(next === "listings" ? "/admin/listings" : next === "orders" ? "/admin/orders" : "/admin/admins")} />}{section === "listings" && <ListingsManager listings={listings} selected={selectedListing} onSelect={setSelectedListing} onSave={saveListing} onDelete={deleteListing} />}{section === "orders" && <OrdersManager orders={orders} listings={listings} onSave={saveOrder} />}{section === "invites" && <InvitesManager services={services} session={session} invites={invites} onRefresh={loadAdmin} onNotice={onNotice} />}{section === "payments" && <PaymentsSettings session={session} />}{section === "settings" && <SettingsView services={services} session={session} profile={profile} embedded onBack={() => navigate("/admin")} onSignedOut={signOut} onNotice={onNotice} />}</div>}</main></div>;
}

function AdminOverview({ listings, orders, invites, onSection }: { listings: Listing[]; orders: Order[]; invites: AdminInvite[]; onSection: (section: "listings" | "orders" | "invites") => void }) {
  const pending = orders.filter((item) => item.order_status === "pending" || item.order_status === "processing").length;
  return <><div className="overview-grid"><StatCard icon={<FileText size={17} />} label="Total listings" value={String(listings.length)} hint={`${listings.filter((item) => item.status === "published").length} published`} /><StatCard icon={<PackageCheck size={17} />} label="Orders to process" value={String(pending)} hint="Payment and fulfillment queue" /><StatCard icon={<Users size={17} />} label="Active invites" value={String(invites.filter((item) => !item.accepted_at && new Date(item.expires_at) > new Date()).length)} hint="Shareable admin access" /></div><div className="admin-two-column"><section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">RECENT ORDERS</span><h2>Order queue</h2></div><button className="text-action" onClick={() => onSection("orders")}>View all <ArrowRight size={14} /></button></div>{orders.length === 0 ? <EmptyAdmin text="No orders yet." /> : <div className="mini-table">{orders.slice(0, 5).map((order) => <div className="mini-row" key={order.id}><span><strong>{order.order_id}</strong><small>{new Date(order.created_at).toLocaleDateString()}</small></span><StatusPill value={order.order_status} /></div>)}</div>}</section><section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">LISTINGS</span><h2>Catalog health</h2></div><button className="text-action" onClick={() => onSection("listings")}>Manage <ArrowRight size={14} /></button></div>{listings.length === 0 ? <EmptyAdmin text="Add your first listing." /> : <div className="mini-table">{listings.slice(0, 5).map((listing) => <div className="mini-row" key={listing.id}><span><strong>{listing.name}</strong><small>{listing.type} · {formatMoney(listing.price, listing.currency)}</small></span><StatusPill value={listing.status} /></div>)}</div>}</section></div></>;
}
function StatCard({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint: string }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>; }
function EmptyAdmin({ text }: { text: string }) { return <div className="admin-empty"><span className="empty-mark" /><p>{text}</p></div>; }

function ListingsManager({ listings, selected, onSelect, onSave, onDelete }: { listings: Listing[]; selected: Listing | null; onSelect: (listing: Listing | null) => void; onSave: (draft: Partial<Listing>) => void; onDelete: (id: string) => void }) {
  return <div className="manager-layout"><section className="admin-card manager-list"><div className="admin-card-heading"><div><span className="eyebrow">CATALOG</span><h2>Listings</h2></div><Button onClick={() => onSelect(null)} icon={<Plus size={15} />}>Add listing</Button></div>{listings.length === 0 ? <EmptyAdmin text="No listings yet. Add approved product information to publish it." /> : <div className="listing-admin-list">{listings.map((listing) => <div className={`listing-admin-row ${selected?.id === listing.id ? "selected" : ""}`} key={listing.id} onClick={() => onSelect(listing)}><div className="listing-admin-main"><div className="listing-admin-icon"><MessageCircle size={15} /></div><div><strong>{listing.name}</strong><span>{listing.type} · {formatMoney(listing.price, listing.currency)}</span></div></div><StatusPill value={listing.status} /><button className="icon-action danger" onClick={(event) => { event.stopPropagation(); onDelete(listing.id); }} aria-label={`Delete ${listing.name}`}><Trash2 size={15} /></button></div>)}</div>}</section><ListingEditor key={selected?.id || "new"} listing={selected} onSave={onSave} onCancel={() => onSelect(null)} /></div>;
}
function ListingEditor({ listing, onSave, onCancel }: { listing: Listing | null; onSave: (draft: Partial<Listing>) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<Partial<Listing>>(listing || { type: "Group", status: "draft", currency: "₦", price: 0 });
  const update = (key: keyof Listing, value: string | number) => setDraft((current) => ({ ...current, [key]: value }));
  return <section className="admin-card editor-card"><div className="admin-card-heading"><div><span className="eyebrow">{listing ? "EDIT LISTING" : "NEW LISTING"}</span><h2>{listing ? "Save changes" : "Add listing"}</h2></div>{listing && <button className="icon-action" onClick={onCancel}><X size={15} /></button>}</div><p className="admin-help">Use administrator-approved wording. The site does not rewrite listing content.</p><form onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><Field label="Product name" value={draft.name || ""} onChange={(value) => update("name", value)} placeholder="Approved listing name" required /><label className="field"><span>Description</span><textarea value={draft.description || ""} onChange={(event) => update("description", event.target.value)} rows={4} placeholder="Enter the approved description" required /></label><div className="field-grid"><label className="field"><span>Type</span><select value={draft.type || "Group"} onChange={(event) => update("type", event.target.value)}><option>Group</option><option>Channel</option></select></label><Field label="Price" type="number" value={String(draft.price ?? "")} onChange={(value) => update("price", Number(value))} placeholder="0" required /></div><div className="field-grid"><Field label="Category" value={draft.category || ""} onChange={(value) => update("category", value)} placeholder="Optional category" /><label className="field"><span>Status</span><select value={draft.status || "draft"} onChange={(event) => update("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div><label className="field"><span>Access link</span><input type="url" value={draft.access_link || ""} onChange={(event) => update("access_link", event.target.value)} placeholder="Added when fulfillment is ready" /></label><Button type="submit" className="full-width" icon={<Check size={15} />}>Save Listing</Button></form></section>;
}

function OrdersManager({ orders, listings, onSave }: { orders: Order[]; listings: Listing[]; onSave: (order: Order, status: Order["order_status"], accessLink: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  return <section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">FULFILLMENT</span><h2>Orders</h2></div><span className="muted-count">{orders.length} total</span></div>{orders.length === 0 ? <EmptyAdmin text="No orders yet." /> : <div className="order-table"><div className="order-row order-head"><span>Order</span><span>Listing</span><span>Payment</span><span>Status</span><span>Action</span></div>{orders.map((order) => { const listing = listings.find((item) => item.id === order.listing_id); return <div className="order-row" key={order.id}><span><strong>{order.order_id}</strong><small>{order.whatsapp_number}<br />{new Date(order.created_at).toLocaleString()}</small></span><span>{listing?.name || "Removed listing"}</span><span><StatusPill value={order.payment_status} /></span><span>{editing === order.id ? <OrderEdit order={order} onSave={onSave} onCancel={() => setEditing(null)} /> : <StatusPill value={order.order_status} />}</span><span>{editing !== order.id && <button className="text-action" onClick={() => setEditing(order.id)}>Update</button>}</span></div>; })}</div>}</section>;
}
function OrderEdit({ order, onSave, onCancel }: { order: Order; onSave: (order: Order, status: Order["order_status"], accessLink: string) => void; onCancel: () => void }) { const [status, setStatus] = useState(order.order_status); const [link, setLink] = useState(order.access_link || ""); return <div className="inline-editor"><select value={status} onChange={(event) => setStatus(event.target.value as Order["order_status"])}><option value="pending">Waiting for payment</option><option value="processing">Processing</option><option value="completed">Ready</option><option value="failed">Payment not completed</option></select><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="Access link when ready" /><div><button onClick={() => onSave(order, status, link)} className="save-mini"><Check size={13} /></button><button onClick={onCancel} className="icon-action"><X size={13} /></button></div></div>; }

function InvitesManager({ services, session, invites, onRefresh, onNotice }: { services: AppServices; session: any; invites: AdminInvite[]; onRefresh: () => void; onNotice: (notice: { kind: "info" | "success" | "error"; text: string }) => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const token = crypto.randomUUID().replaceAll("-", "");
    const { error } = await services.supabase.from("admin_invites").insert({ token, invited_email: email.trim() || null, created_by: session.user.id, expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
    if (error) onNotice({ kind: "error", text: error.message }); else { setEmail(""); onNotice({ kind: "success", text: "Admin invite created. Copy the link below to share it." }); onRefresh(); }
    setBusy(false);
  };
  const copyInvite = async (token: string) => { const link = `${CANONICAL_SITE_URL}/?invite=${encodeURIComponent(token)}`; await navigator.clipboard?.writeText(link); setCopied(token); window.setTimeout(() => setCopied(""), 1600); };
  const revoke = async (id: string) => { if (!window.confirm("Revoke this admin invite?")) return; const { error } = await services.supabase.from("admin_invites").delete().eq("id", id); if (error) onNotice({ kind: "error", text: error.message }); else onRefresh(); };
  return <div className="admin-two-column invite-layout"><section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h2>Create an invite</h2></div><KeyRound size={18} className="gold-icon" /></div><p className="admin-help">Invite links expire after seven days. The recipient can use one link to sign up or sign in, then redeem administrator access.</p><form onSubmit={createInvite}><Field label="Email restriction (optional)" value={email} onChange={setEmail} type="email" placeholder="Leave blank for a shareable link" /><Button type="submit" disabled={busy} className="full-width" icon={busy ? <RefreshCw className="spin" size={15} /> : <Link2 size={15} />}>{busy ? "Creating" : "Create invite link"}</Button></form></section><section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">INVITE LOG</span><h2>Shareable links</h2></div><span className="muted-count">{invites.length}</span></div>{invites.length === 0 ? <EmptyAdmin text="No administrator invites yet." /> : <div className="invite-list">{invites.map((invite) => { const expired = new Date(invite.expires_at) < new Date(); return <div className="invite-row" key={invite.id}><div><strong>{invite.invited_email || "Open invite"}</strong><span>{invite.accepted_at ? "Accepted" : expired ? "Expired" : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}</span></div><div className="invite-actions">{!invite.accepted_at && !expired && <button className="copy-button" onClick={() => copyInvite(invite.token)}>{copied === invite.token ? <Check size={14} /> : <Copy size={14} />} {copied === invite.token ? "Copied" : "Copy link"}</button>}<button className="icon-action danger" onClick={() => revoke(invite.id)} aria-label="Revoke invite"><Trash2 size={14} /></button></div></div>; })}</div>}</section></div>;
}

function SettingsView({ services, session, profile, onBack, onSignedOut, onNotice, embedded = false }: { services: AppServices; session: any; profile: Profile; onBack: () => void; onSignedOut: () => void; onNotice: (notice: { kind: "info" | "success" | "error"; text: string }) => void; embedded?: boolean }) {
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const { error } = await services.supabase.from("profiles").update({ display_name: displayName.trim() || null }).eq("id", profile.id); if (error) onNotice({ kind: "error", text: error.message }); else onNotice({ kind: "success", text: "Account details saved." }); setBusy(false); };
  const updateCredentials = async (event: FormEvent) => { event.preventDefault(); setBusy(true); const updates: { email?: string; password?: string } = {}; if (email.trim() && email.trim() !== profile.email) updates.email = email.trim(); if (password) updates.password = password; const { error } = await services.supabase.auth.updateUser(updates); if (error) onNotice({ kind: "error", text: error.message }); else { setPassword(""); onNotice({ kind: "success", text: updates.email ? "Credentials updated. Check your email if confirmation is required." : "Password updated." }); } setBusy(false); };
  const deleteAccount = async () => { if (deletePhrase !== "DELETE MY ACCOUNT") return; setBusy(true); const response = await fetch("/api/account/delete", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }); const payload = await response.json().catch(() => ({})); if (!response.ok) { onNotice({ kind: "error", text: payload.error || "Account deletion is not configured." }); setBusy(false); return; } await services.supabase.auth.signOut(); onSignedOut(); };
  const content = <div className={`settings-content ${embedded ? "embedded-settings" : ""}`}><div className="settings-heading"><div><span className="eyebrow">ACCOUNT SETTINGS</span><h2>Keep your details current.</h2><p>Update the details used for your THEEYA’S DELUXE HUB account.</p></div>{!embedded && <Button variant="ghost" onClick={onBack} icon={<ArrowRight size={15} />}>Back to storefront</Button>}</div><div className="settings-grid"><section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">PROFILE</span><h3>Personal details</h3></div><UserRound size={18} className="gold-icon" /></div><form onSubmit={saveProfile}><Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Your name" /><Button type="submit" disabled={busy} icon={<Check size={15} />}>Save details</Button></form></section><section className="admin-card"><div className="admin-card-heading"><div><span className="eyebrow">LOGIN</span><h3>Email and password</h3></div><LockKeyhole size={18} className="gold-icon" /></div><form onSubmit={updateCredentials}><Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" /><Field label="New password" type="password" value={password} onChange={setPassword} placeholder="Leave blank to keep current password" minLength={8} /><Button type="submit" variant="outline" disabled={busy} icon={<KeyRound size={15} />}>Update login</Button></form></section></div><section className="danger-zone"><div><span className="eyebrow">DANGER ZONE</span><h3>Delete your account</h3><p>This removes your site account. Completed order records are retained for operational history, but your user access is removed.</p></div>{!showDelete ? <Button variant="danger" onClick={() => setShowDelete(true)} icon={<Trash2 size={15} />}>Delete account</Button> : <div className="delete-confirm"><p>Type <strong>DELETE MY ACCOUNT</strong> to confirm.</p><input value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} placeholder="DELETE MY ACCOUNT" /><div><Button variant="ghost" onClick={() => { setShowDelete(false); setDeletePhrase(""); }}>Cancel</Button><Button variant="danger" disabled={deletePhrase !== "DELETE MY ACCOUNT" || busy} onClick={deleteAccount} icon={<Trash2 size={14} />}>Confirm deletion</Button></div></div>}</section></div>;
  if (embedded) return content;
  return <div className="settings-shell"><header className="settings-topbar"><a className="site-brand" href="#top"><BrandLockup compact /><span><strong>THEEYA’S</strong><small>DELUXE HUB</small></span></a><button className="signout-nav" onClick={onSignedOut}><LogOut size={16} /> Sign out</button></header>{content}</div>;
}

function sectionTitle(section: string) { return ({ listings: "Listings", orders: "Orders", invites: "Admin invites", payments: "Payments", settings: "Account settings" } as Record<string, string>)[section] || "Workspace"; }
function initials(value: string) { return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function formatMoney(value: number, currency = "₦") { return `${currency}${Number(value || 0).toLocaleString("en-NG")}`; }

export default App;
