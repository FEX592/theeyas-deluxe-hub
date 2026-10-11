import React from 'react';
import { CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export const AuthLayout: React.FC<AuthLayoutProps> = ({ eyebrow, title, description, children }) => (
  <main className="relative min-h-screen overflow-hidden bg-[#08090E] px-4 py-5 text-[#F4F1F8] sm:px-6 sm:py-8">
    <div className="pointer-events-none absolute -left-40 top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#742B78]/20 blur-[110px]" />
    <div className="pointer-events-none absolute -bottom-48 right-[-8rem] h-[32rem] w-[32rem] rounded-full bg-[#C09337]/10 blur-[120px]" />

    <div className="relative mx-auto grid min-h-[min(850px,calc(100vh-2.5rem))] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#101119] shadow-[0_32px_100px_rgba(0,0,0,0.5)] lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative flex min-h-[245px] flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_at_20%_15%,rgba(138,62,144,0.48),transparent_45%),linear-gradient(145deg,#211328_0%,#15111C_52%,#11131B_100%)] p-6 sm:p-9 lg:min-h-full lg:p-11">
        <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full border border-white/[0.07]" />
        <div className="pointer-events-none absolute -right-12 top-[38%] h-48 w-48 rounded-full border border-[#E5C782]/15" />
        <div className="pointer-events-none absolute bottom-[-7rem] left-[-4rem] h-72 w-72 rounded-full bg-[#8A3E90]/15 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <span aria-hidden="true" />
          <span className="hidden items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E5C782]/75 sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            The deluxe experience
          </span>
        </div>

        <div className="relative z-10 mt-8 lg:mt-16">
          <img src="/brand-mark.svg" alt="THEEYA'S DELUXE HUB" className="mb-8 h-12 w-auto object-contain object-left sm:h-14" />
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.25em] text-[#E5C782]">Curated for your next move</p>
          <h2 className="max-w-md font-display text-3xl font-extrabold leading-[1.12] tracking-[-0.035em] text-white sm:text-4xl lg:text-[2.8rem]">
            Your next WhatsApp Group or Channel is closer.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/60 sm:text-[15px]">
            Discover WhatsApp Groups and Channels to buy, with a simple way to manage your orders.
          </p>
        </div>

        <div className="relative z-10 mt-8 hidden rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm sm:block lg:mt-12">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#E5C782]/10 text-[#E5C782]"><LockKeyhole className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold text-white/90">A more personal hub</p>
              <p className="mt-1 text-xs leading-5 text-white/50">Your account keeps your WhatsApp Group and Channel orders together in one place.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-medium text-white/50">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#E5C782]" /> Curated WhatsApp Groups & Channels</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#E5C782]" /> Secure sign-in</span>
          </div>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-[#101119] px-5 py-9 sm:px-10 sm:py-12 lg:px-14">
        <div className="w-full max-w-[430px]">
          <div className="mb-7">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#D6B36A]">{eyebrow}</p>
            <h1 className="font-display text-3xl font-bold tracking-[-0.035em] text-white sm:text-[2.1rem]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{description}</p>
          </div>
          {children}
        </div>
      </section>
    </div>
  </main>
);
