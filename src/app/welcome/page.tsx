import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import WelcomeLoginForm from "@/components/WelcomeLoginForm";
import Logo from "@/components/Logo";
import { getSeasonalPromo, getAnnualPricing } from "@/lib/seasonal-promo";

export const metadata: Metadata = {
  title: "Taxora — Financial Tool for Real Estate Professionals",
  description: "Track income, expenses, mileage, and taxes in one place. Built for realtors and real estate professionals. AI tax advisor, deal tracker, and investment portfolio included.",
  openGraph: {
    title: "Taxora — Financial Tool for Real Estate Professionals",
    description: "Track income, expenses, mileage, and taxes in one place. Built for realtors and real estate professionals.",
    type: "website",
  },
};

const FEATURES = [
  {
    title: "Income & Expense Tracking",
    description: "Log weekly income, business expenses, and mileage. See your tax picture in real time.",
    icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
  },
  {
    title: "Tax Estimation",
    description: "Real-time federal, state, and SE tax calculations built for self-employed professionals.",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Net Worth Dashboard",
    description: "Track bank accounts, loans, home equity, and investments all in one view.",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
  {
    title: "Accountant-Ready Exports",
    description: "Export clean spreadsheets for your CPA at tax time. No more scrambling for receipts.",
    icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
];

const PRO_FEATURES = [
  {
    title: "AI Tax Advisor",
    description: "Get personalized tax strategies from an AI trained on real estate tax law.",
    icon: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
  },
  {
    title: "Real Estate Portfolio",
    description: "Track your properties with live equity bars, appreciation growth, and principal vs. interest breakdowns.",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    title: "Deal Tracker",
    description: "Manage real estate deals from acquisition through closing with full expense tracking.",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  },
];

export default function WelcomePage() {
  const promo = getSeasonalPromo();
  const annual = getAnnualPricing();
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            <Link href="#login" className="text-sm text-slate-300 hover:text-slate-100">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="login" className="max-w-6xl mx-auto px-6 pt-16 pb-16">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — marketing text */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
              The financial tool built for<br />
              <span className="text-emerald-600">real estate professionals</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-xl mb-8">
              Track income, expenses, mileage, and taxes — all in one place.
              Know exactly what you owe before tax season hits.
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-4">
              <Link
                href="/signup"
                className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-base font-medium hover:bg-emerald-700 transition-colors"
              >
                Start Your 14-Day Free Trial
              </Link>
              <Link
                href="#pricing"
                className="text-slate-300 px-6 py-3 rounded-lg text-base font-medium hover:text-slate-100 transition-colors"
              >
                View Pricing
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-4">No credit card required. Full Pro access during trial.</p>
          </div>

          {/* Right — login form */}
          <div className="w-full lg:w-auto flex-shrink-0">
            <Suspense fallback={null}>
              <WelcomeLoginForm />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Basic Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h3 className="text-2xl font-bold text-slate-100 text-center mb-2">Everything you need to stay on top of your taxes</h3>
        <p className="text-slate-400 text-center mb-12">Included in every plan</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-100 mb-1">{f.title}</h4>
                <p className="text-sm text-slate-400">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pro Features */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">PRO</span>
            <h3 className="text-2xl font-bold text-white mt-4 mb-2">Power tools for serious producers</h3>
            <p className="text-slate-400">Available on the Pro plan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PRO_FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-800 rounded-lg p-6">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                  </svg>
                </div>
                <h4 className="font-semibold text-white mb-2">{f.title}</h4>
                <p className="text-sm text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex justify-center mb-3">
          <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">{promo.badge}</span>
        </div>
        <h3 className="text-2xl font-bold text-slate-100 text-center mb-2">{promo.name}</h3>
        <p className="text-slate-400 text-center mb-12">Limited time pricing. Start with a 14-day free trial — no credit card required.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Basic */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-sm">
            <h4 className="text-lg font-semibold text-slate-100 mb-1">Basic</h4>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl font-semibold text-slate-500 line-through">{promo.basicOriginal}</span>
              <span className="text-4xl font-bold text-slate-100">$9.99</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">Everything you need to track income, expenses, and taxes.</p>
            <ul className="space-y-3 mb-8">
              {["Weekly income & expense tracking", "Mileage logging", "Tax estimation calculator", "Net worth dashboard", "Recurring items & reminders", "Accountant-ready exports", "Investment & crypto portfolio tracker"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center bg-slate-700 text-white py-3 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors"
            >
              Start Free Trial
            </Link>
            <div className="mt-4 border border-emerald-700/40 bg-emerald-900/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Annual Plan</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">15% off</span>
              </div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-sm text-slate-500 line-through">${annual.fullBasic.toFixed(2)}</span>
                <span className="text-xl font-bold text-slate-100">${annual.basicAnnual.toFixed(2)}</span>
                <span className="text-xs text-slate-400">/year</span>
              </div>
            </div>
          </div>

          {/* Pro */}
          <div className="bg-slate-800 border-2 border-emerald-500 rounded-xl p-8 shadow-sm relative">
            <span className="absolute -top-3 left-6 bg-emerald-500 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
              MOST POPULAR
            </span>
            <h4 className="text-lg font-semibold text-slate-100 mb-1">Pro</h4>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-xl font-semibold text-slate-500 line-through">{promo.proOriginal}</span>
              <span className="text-4xl font-bold text-slate-100">$19.99</span>
              <span className="text-slate-400">/month</span>
            </div>
            <p className="text-sm text-slate-400 mb-6">Everything in Basic, plus powerful tools for top producers.</p>
            <ul className="space-y-3 mb-8">
              {["Everything in Basic", "AI Tax Advisor chatbot", "Real estate portfolio tracker", "Real estate deal tracker", "Priority support"].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center bg-emerald-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              Start Free Trial
            </Link>
            <div className="mt-4 border border-emerald-700/40 bg-emerald-900/10 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Annual Plan</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">15% off</span>
              </div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-sm text-slate-500 line-through">${annual.fullPro.toFixed(2)}</span>
                <span className="text-xl font-bold text-slate-100">${annual.proAnnual.toFixed(2)}</span>
                <span className="text-xs text-slate-400">/year</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-600 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            Stop guessing. Start tracking.
          </h3>
          <p className="text-emerald-100 mb-8">
            Join real estate professionals who save hours every week on their bookkeeping and never get surprised at tax time.
          </p>
          <Link
            href="/signup"
            className="inline-block bg-slate-800 text-emerald-400 px-8 py-3 rounded-lg text-base font-medium hover:bg-slate-700 transition-colors"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Taxora. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-300">Terms</Link>
            <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-300">Privacy</Link>
            <Link href="#login" className="text-sm text-slate-500 hover:text-slate-300">Log in</Link>
            <Link href="/signup" className="text-sm text-slate-500 hover:text-slate-300">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
