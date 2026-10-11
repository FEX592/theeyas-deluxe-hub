import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.ts';
import { Listing } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';
import { ArrowLeft, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const { profile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);

  // Form Fields
  const [fullName, setFullName] = useState(profile?.display_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Processing state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) return;
    api
      .getListing(listingId)
      .then(setListing)
      .catch((err) => setErrorMessage(err.message || 'Listing not found'))
      .finally(() => setLoadingListing(false));
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address for your receipt and WhatsApp invitation link.');
      return;
    }
    if (!whatsappNumber.trim() || whatsappNumber.length < 8) {
      setErrorMessage('Please enter a valid WhatsApp phone number (e.g. +234 801 234 5678).');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await api.initializePayment({
        listing_id: listing.id,
        customer_name: fullName.trim(),
        customer_email: email.trim(),
        whatsapp_number: whatsappNumber.trim(),
        user_id: profile?.id,
      });

      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        throw new Error('Payment gateway did not provide an authorization redirect URL.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initiation failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Navigation Back */}
        <div className="mb-8">
          <Link
            to={listing ? `/marketplace/${listing.slug}` : '/marketplace'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FACC15] hover:text-[#EAB308] mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Listing</span>
          </Link>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">
            Order Checkout
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Review your WhatsApp Group or Channel purchase and enter the contact details for your order and invitation link.
          </p>
        </div>

        {loadingListing ? (
          <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FACC15] mx-auto mb-3" />
            <p className="text-xs text-[#9CA3AF]">Loading listing details...</p>
          </div>
        ) : !listing ? (
          <div className="bg-[#111622] rounded-2xl border border-red-800 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h2 className="font-bold text-base text-white">Listing Unavailable</h2>
            <p className="text-xs text-[#9CA3AF] mt-1 mb-4">{errorMessage || 'Unable to load listing.'}</p>
            <Link
              to="/marketplace"
              className="px-4 py-2 text-xs font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] rounded-xl inline-block"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Form Left Column */}
            <div className="md:col-span-7 bg-[#111622] rounded-2xl border border-[#1F2637] p-6 md:p-8 shadow-xl">
              <h2 className="font-display font-bold text-lg text-white mb-1">
                Customer Information
              </h2>
              <p className="text-xs text-[#9CA3AF] mb-6">
                We use your email and WhatsApp number to confirm your WhatsApp Group or Channel purchase and send its invitation link.
              </p>

              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    Full Name <span className="text-[#FACC15]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Adeola Johnson"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    Email Address <span className="text-[#FACC15]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. adeola@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Your payment receipt and WhatsApp Group or Channel invitation link will be sent here.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">
                    WhatsApp Phone Number <span className="text-[#FACC15]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +234 803 123 4567"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#0B0F17] border border-[#1E2638] rounded-xl focus:outline-none focus:border-[#FACC15] text-white"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Enter the phone number linked to your WhatsApp account so you can join the WhatsApp Group or Channel you buy.
                  </span>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-6 text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Initializing Paystack Checkout...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-black" />
                        <span>Proceed to Pay ₦{listing.price_ngn.toLocaleString('en-NG')}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <span className="text-[11px] text-[#9CA3AF] inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                    Secured by Paystack (Cards, Bank Transfer, USSD)
                  </span>
                </div>
              </form>
            </div>

            {/* Order Summary Right Column */}
            <div className="md:col-span-5 bg-[#111622] rounded-2xl border border-[#1F2637] p-6 shadow-xl space-y-5">
              <h3 className="font-display font-bold text-sm tracking-wide text-white uppercase">
                Order Summary
              </h3>

              <div className="flex gap-3.5 pb-4 border-b border-[#1F2637]">
                <img
                  src={listing.image_url}
                  alt={listing.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-xl object-cover bg-[#0B0F17] border border-[#1E2638] shrink-0"
                />
                <div>
                  <h4 className="font-display font-semibold text-xs text-white line-clamp-2">
                    {listing.name}
                  </h4>
                  <span className="text-[11px] text-[#9CA3AF] block mt-0.5">
                    {listing.type === 'group' ? 'WhatsApp Group' : 'WhatsApp Channel'}
                  </span>
                  <span className="text-[11px] text-[#10B981] font-medium block mt-0.5">
                    {listing.fulfillment_mode === 'automatic' ? 'Instant Delivery' : 'Verified Fulfillment'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#9CA3AF]">
                <div className="flex justify-between">
                  <span>WhatsApp Group/Channel Price</span>
                  <span className="font-mono text-white font-medium">
                    ₦{listing.price_ngn.toLocaleString('en-NG')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Fulfillment Processing</span>
                  <span className="font-mono text-[#10B981] font-medium">Included</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#1F2637] flex justify-between items-baseline">
                <span className="font-display font-bold text-sm text-white">Total Payable</span>
                <span className="font-display font-extrabold text-xl text-[#FACC15] font-mono tabular-nums">
                  ₦{listing.price_ngn.toLocaleString('en-NG')}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
