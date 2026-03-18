"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubscription } from "./SubscriptionProvider";

const RENEWAL_MESSAGES = [
  "Don't lose access to your financial data",
  "Keep your tax tracking uninterrupted",
  "Your reports and insights are waiting for you",
  "Stay on top of your finances",
  "Your year-end tax prep depends on consistent tracking",
];

function getEncouragement(): string {
  const day = new Date().getDate();
  return RENEWAL_MESSAGES[day % RENEWAL_MESSAGES.length];
}

export default function TrialBanner() {
  const { plan, daysLeft, currentPeriodEnd } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Trial banner
  if (plan === "TRIAL" && daysLeft !== null) {
    const urgent = daysLeft <= 3;
    return (
      <div className={`border-b px-4 py-2 flex items-center justify-between text-sm ${
        urgent ? "bg-red-900/30 border-red-700" : "bg-amber-900/30 border-amber-700"
      }`}>
        <span className={urgent ? "text-red-400" : "text-amber-400"}>
          {daysLeft > 0
            ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your free trial`
            : "Your free trial ends today"}
          {" — "}
          <Link href="/billing" className={`font-medium underline ${urgent ? "hover:text-red-300" : "hover:text-amber-300"}`}>
            Choose a plan
          </Link>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className={`ml-4 ${urgent ? "text-red-600 hover:text-red-400" : "text-amber-600 hover:text-amber-400"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // Subscription renewal banner for paid users
  if ((plan === "BASIC" || plan === "PRO") && currentPeriodEnd) {
    const endDate = new Date(currentPeriodEnd);
    const now = new Date();
    const msLeft = endDate.getTime() - now.getTime();
    const daysUntilEnd = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

    // Show banner when within 14 days of expiration
    if (daysUntilEnd > 14 || daysUntilEnd < 0) return null;

    const urgent = daysUntilEnd <= 3;
    const endStr = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const encouragement = getEncouragement();

    return (
      <div className={`border-b px-4 py-2.5 flex items-center justify-between text-sm ${
        urgent
          ? "bg-red-900/30 border-red-700"
          : "bg-gradient-to-r from-amber-900/30 to-emerald-900/20 border-amber-700/50"
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
            urgent ? "bg-red-500/20" : "bg-amber-500/20"
          }`}>
            <svg className={`w-3.5 h-3.5 ${urgent ? "text-red-400" : "text-amber-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className={urgent ? "text-red-400" : "text-amber-300"}>
            {daysUntilEnd === 0
              ? `Your ${plan} plan expires today.`
              : daysUntilEnd === 1
              ? `Your ${plan} plan expires tomorrow.`
              : `Your ${plan} plan expires ${endStr} (${daysUntilEnd} days).`}
            {" "}
            <span className="text-slate-300">{encouragement}.</span>
            {" "}
            <Link href="/billing" className={`font-semibold underline ${
              urgent ? "text-red-300 hover:text-red-200" : "text-emerald-400 hover:text-emerald-300"
            }`}>
              Renew now
            </Link>
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className={`ml-4 flex-shrink-0 ${urgent ? "text-red-600 hover:text-red-400" : "text-amber-600 hover:text-amber-400"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return null;
}
