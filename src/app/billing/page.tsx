"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSubscription } from "@/components/SubscriptionProvider";

const BASIC_FEATURES = [
  "Weekly income & expense tracking",
  "Recurring items & reminders",
  "Account balance tracking",
  "Net worth dashboard",
  "Accountant-ready exports",
  "Tax estimation calculator",
];

const PRO_FEATURES = [
  "Everything in Basic",
  "AI Tax Advisor chatbot",
  "Investment & crypto portfolio tracker",
  "Real estate deal tracker",
];

export default function BillingPage() {
  const { plan, daysLeft, loading } = useSubscription();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function handleCheckout(selectedPlan: "BASIC" | "PRO") {
    setCheckoutLoading(selectedPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return null;

  const showPlanCards = plan === "TRIAL" || plan === "EXPIRED";

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Billing</h2>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-4 mb-6">
          Your subscription is now active! Enjoy all features.
        </div>
      )}
      {canceled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 mb-6">
          Checkout was canceled. You can try again anytime.
        </div>
      )}

      {/* Current plan status */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-slate-800">Current Plan</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            plan === "PRO" ? "bg-emerald-100 text-emerald-700" :
            plan === "BASIC" ? "bg-blue-100 text-blue-700" :
            plan === "TRIAL" ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          }`}>
            {plan === "TRIAL" ? "Free Trial" : plan}
          </span>
        </div>
        {plan === "TRIAL" && daysLeft !== null && (
          <p className="text-sm text-slate-500">
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining in your free trial. You have full access to all Pro features.`
              : "Your trial has ended. Choose a plan to continue."}
          </p>
        )}
        {plan === "EXPIRED" && (
          <p className="text-sm text-slate-500">
            Your trial has ended. Choose a plan below to continue using Tax Tracker.
          </p>
        )}
        {(plan === "BASIC" || plan === "PRO") && (
          <div className="flex items-center gap-3 mt-3">
            {plan === "BASIC" && (
              <button
                onClick={() => handleCheckout("PRO")}
                disabled={checkoutLoading !== null}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {checkoutLoading === "PRO" ? "Redirecting..." : "Upgrade to Pro"}
              </button>
            )}
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {portalLoading ? "Loading..." : "Manage Billing"}
            </button>
          </div>
        )}
      </div>

      {/* Plan comparison cards */}
      {showPlanCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Basic</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-slate-800">$9.99</span>
              <span className="text-sm text-slate-500">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout("BASIC")}
              disabled={checkoutLoading !== null}
              className="w-full bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50"
            >
              {checkoutLoading === "BASIC" ? "Redirecting..." : "Choose Basic"}
            </button>
          </div>

          {/* Pro */}
          <div className="bg-white border-2 border-emerald-500 rounded-lg p-6 shadow-sm relative">
            <span className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
              RECOMMENDED
            </span>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Pro</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-slate-800">$19.99</span>
              <span className="text-sm text-slate-500">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout("PRO")}
              disabled={checkoutLoading !== null}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {checkoutLoading === "PRO" ? "Redirecting..." : "Choose Pro"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
