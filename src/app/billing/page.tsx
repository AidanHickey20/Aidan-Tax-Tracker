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
  "Investment & crypto portfolio tracker",
];

const PRO_FEATURES = [
  "Everything in Basic",
  "AI Tax Advisor chatbot",
  "Real estate portfolio tracker",
  "Real estate deal tracker",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

export default function BillingPage() {
  const { plan, daysLeft, currentPeriodEnd, hasStripeCustomer, loading } = useSubscription();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDone, setCancelDone] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

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
    setPortalError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || "Unable to open billing portal. Please try again.");
      }
    } catch {
      setPortalError("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleCancel() {
    setCancelLoading(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      if (res.ok) {
        setCancelDone(true);
        setCancelConfirm(false);
        // Reload the page after a short delay to reflect the change
        setTimeout(() => window.location.reload(), 1500);
      }
    } finally {
      setCancelLoading(false);
    }
  }

  async function handlePromo() {
    setPromoLoading(true);
    setPromoError("");
    setPromoSuccess("");
    try {
      const res = await fetch("/api/stripe/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || "Invalid promo code");
      } else {
        setPromoSuccess(`Promo applied! You now have ${data.plan} access.`);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setPromoError("Something went wrong. Please try again.");
    } finally {
      setPromoLoading(false);
    }
  }

  if (loading) return null;

  const showPlanCards = plan === "TRIAL" || plan === "EXPIRED";
  const isActivePaid = plan === "BASIC" || plan === "PRO";

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Billing</h2>

      {success && (
        <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-400 rounded-lg p-4 mb-6">
          Your subscription is now active! Enjoy all features.
        </div>
      )}
      {canceled && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg p-4 mb-6">
          Checkout was canceled. You can try again anytime.
        </div>
      )}
      {cancelDone && (
        <div className="bg-amber-900/30 border border-amber-700 text-amber-400 rounded-lg p-4 mb-6">
          Your subscription has been canceled. You&apos;ll retain access until the end of your billing period.
        </div>
      )}

      {/* Current plan status */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-slate-100">Current Plan</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            plan === "PRO" ? "bg-emerald-900/30 text-emerald-400" :
            plan === "BASIC" ? "bg-blue-900/30 text-blue-400" :
            plan === "TRIAL" ? "bg-amber-900/30 text-amber-400" :
            "bg-red-900/30 text-red-400"
          }`}>
            {plan === "TRIAL" ? "Free Trial" : plan}
          </span>
        </div>
        {plan === "TRIAL" && daysLeft !== null && (
          <p className="text-sm text-slate-400">
            {daysLeft > 0
              ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining in your free trial. You have full access to all Pro features.`
              : "Your trial has ended. Choose a plan to continue."}
          </p>
        )}
        {plan === "EXPIRED" && (
          <p className="text-sm text-slate-400">
            Your trial has ended. Choose a plan below to continue using Taxora.
          </p>
        )}
        {isActivePaid && (
          <div className="mt-3 space-y-3">
            {plan === "BASIC" && (
              <button
                onClick={() => handleCheckout("PRO")}
                disabled={checkoutLoading !== null}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {checkoutLoading === "PRO" ? "Redirecting..." : "Upgrade to Pro"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Billing Details — for active paid users */}
      {isActivePaid && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Billing Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Plan</span>
              <span className="text-slate-100 font-medium">
                {plan === "PRO" ? "Pro — $19.99/mo" : "Basic — $9.99/mo"}
              </span>
            </div>
            {currentPeriodEnd && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Next billing date</span>
                <span className="text-slate-100">{formatDate(currentPeriodEnd)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Payment method</span>
              <span className="text-slate-100">
                {hasStripeCustomer ? "On file via Stripe" : "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-700">
            {hasStripeCustomer && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                {portalLoading ? "Loading..." : "Manage Payment Method"}
              </button>
            )}
            {plan === "BASIC" && (
              <button
                onClick={() => handleCheckout("PRO")}
                disabled={checkoutLoading !== null}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {checkoutLoading === "PRO" ? "Redirecting..." : "Upgrade to Pro"}
              </button>
            )}
            {!cancelConfirm ? (
              <button
                onClick={() => setCancelConfirm(true)}
                className="text-sm text-slate-500 hover:text-red-400 transition-colors ml-auto"
              >
                Cancel subscription
              </button>
            ) : (
              <div className="flex items-center gap-3 ml-auto bg-red-900/20 border border-red-800 rounded-lg px-4 py-2">
                <span className="text-sm text-red-400">Are you sure?</span>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="text-sm font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  {cancelLoading ? "Canceling..." : "Yes, cancel"}
                </button>
                <button
                  onClick={() => setCancelConfirm(false)}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Never mind
                </button>
              </div>
            )}
          </div>

          {portalError && (
            <p className="text-sm text-red-400 mt-3">{portalError}</p>
          )}
        </div>
      )}

      {/* Plan comparison cards */}
      {showPlanCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-100 mb-1">Basic</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-slate-100">$9.99</span>
              <span className="text-sm text-slate-400">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
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
          <div className="bg-slate-800 border-2 border-emerald-500 rounded-lg p-6 shadow-sm relative">
            <span className="absolute -top-3 left-4 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded">
              RECOMMENDED
            </span>
            <h3 className="text-lg font-semibold text-slate-100 mb-1">Pro</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-slate-100">$19.99</span>
              <span className="text-sm text-slate-400">/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
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

      {/* Promo Code */}
      {showPlanCards && (
        <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Have a promo code?</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handlePromo(); }}
              placeholder="Enter promo code"
              className="flex-1 border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              onClick={handlePromo}
              disabled={promoLoading || !promoCode.trim()}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {promoLoading ? "Applying..." : "Apply"}
            </button>
          </div>
          {promoError && <p className="text-sm text-red-400 mt-2">{promoError}</p>}
          {promoSuccess && <p className="text-sm text-emerald-400 mt-2">{promoSuccess}</p>}
        </div>
      )}
    </div>
  );
}
