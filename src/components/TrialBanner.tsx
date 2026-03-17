"use client";

import { useState } from "react";
import Link from "next/link";
import { useSubscription } from "./SubscriptionProvider";

export default function TrialBanner() {
  const { plan, daysLeft } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (plan !== "TRIAL" || dismissed || daysLeft === null) return null;

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
