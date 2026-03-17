"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubscription } from "./SubscriptionProvider";

export default function TrialBanner() {
  const { plan, daysLeft } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (plan !== "TRIAL" || dismissed || daysLeft === null) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-700 px-4 py-2 flex items-center justify-between text-sm">
      <span className="text-amber-400">
        {daysLeft > 0
          ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left in your free trial`
          : "Your free trial has ended"}
        {" — "}
        <Link href="/billing" className="font-medium underline hover:text-amber-300">
          Choose a plan
        </Link>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-400 ml-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
