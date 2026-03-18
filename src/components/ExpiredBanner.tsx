"use client";

import Link from "next/link";
import { useSubscription } from "./SubscriptionProvider";
import { getSeasonalPromo } from "@/lib/seasonal-promo";

interface ExpiredBannerProps {
  message?: string;
  compact?: boolean;
}

export default function ExpiredBanner({ message, compact }: ExpiredBannerProps) {
  const { plan } = useSubscription();
  const promo = getSeasonalPromo();
  if (plan !== "EXPIRED") return null;

  if (compact) {
    return (
      <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-4 py-3 flex items-center justify-between text-sm mb-6">
        <span className="text-amber-400">
          {message || "Your free trial has ended. Choose a plan to continue editing."}
        </span>
        <Link
          href="/billing"
          className="ml-4 flex-shrink-0 bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          Choose a Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-800 to-emerald-900/20 border border-slate-700 rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 mb-1">
            Your free trial has ended
          </h3>
          <p className="text-slate-300 text-sm">
            {message || "Your data is safe and you can still view everything. Choose a plan to unlock editing, new entries, and all features."}
          </p>
          <div className="flex gap-3 mt-4">
            <Link
              href="/billing"
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              View Plans — <span className="line-through opacity-60">{promo.basicOriginal}</span> Starting at $9.99/mo
            </Link>
          </div>
        </div>
        <div className="hidden sm:block text-emerald-600 flex-shrink-0">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
