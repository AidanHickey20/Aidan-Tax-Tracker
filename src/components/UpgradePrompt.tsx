"use client";

import Link from "next/link";

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  "AI Tax Advisor": "Get personalized tax advice powered by AI, tailored to your real estate business.",
  "Deal Tracker": "Manage your real estate deals from acquisition through closing with expense tracking.",
  "Real Estate Portfolio": "Track your properties with live equity bars, appreciation growth, and principal vs. interest breakdowns.",
};

export default function UpgradePrompt({ feature }: { feature: string }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-700 rounded-full mb-4">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">
        Upgrade to Pro to unlock {feature}
      </h3>
      <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
        {FEATURE_DESCRIPTIONS[feature] || `Access ${feature} and more with the Pro plan.`}
      </p>
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
      >
        Upgrade to Pro — $19.99/mo
      </Link>
    </div>
  );
}
