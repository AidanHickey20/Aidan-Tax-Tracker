"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface SubscriptionState {
  plan: "TRIAL" | "BASIC" | "PRO" | "EXPIRED";
  isProUser: boolean;
  canEdit: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  daysLeft: number | null;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
  plan: "TRIAL",
  isProUser: true,
  canEdit: true,
  trialEndsAt: null,
  currentPeriodEnd: null,
  hasStripeCustomer: false,
  daysLeft: null,
  loading: true,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

export default function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [state, setState] = useState<SubscriptionState>({
    plan: "TRIAL",
    isProUser: true,
    canEdit: true,
    trialEndsAt: null,
    currentPeriodEnd: null,
    hasStripeCustomer: false,
    daysLeft: null,
    loading: true,
  });

  const fetchSubscription = useCallback(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((data) => {
        const plan = data.plan as SubscriptionState["plan"];
        const isProUser = plan === "PRO" || plan === "TRIAL";
        const canEdit = plan !== "EXPIRED";
        let daysLeft: number | null = null;
        if (data.trialEndsAt) {
          daysLeft = Math.max(0, Math.ceil((new Date(data.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        }
        setState({
          plan, isProUser, canEdit,
          trialEndsAt: data.trialEndsAt,
          currentPeriodEnd: data.currentPeriodEnd ?? null,
          hasStripeCustomer: data.hasStripeCustomer ?? false,
          daysLeft, loading: false,
        });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Fetch immediately
    fetchSubscription();

    // Re-fetch every hour so daysLeft stays current and trial expiration is caught
    const interval = setInterval(fetchSubscription, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [status, fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}
