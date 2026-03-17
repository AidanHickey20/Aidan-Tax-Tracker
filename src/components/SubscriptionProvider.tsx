"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface SubscriptionState {
  plan: "TRIAL" | "BASIC" | "PRO" | "EXPIRED";
  isProUser: boolean;
  canEdit: boolean;
  trialEndsAt: string | null;
  daysLeft: number | null;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
  plan: "TRIAL",
  isProUser: true,
  canEdit: true,
  trialEndsAt: null,
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
    daysLeft: null,
    loading: true,
  });

  useEffect(() => {
    if (status !== "authenticated") return;

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
        setState({ plan, isProUser, canEdit, trialEndsAt: data.trialEndsAt, daysLeft, loading: false });
      })
      .catch(() => {
        setState((s) => ({ ...s, loading: false }));
      });
  }, [status]);

  return (
    <SubscriptionContext.Provider value={state}>
      {children}
    </SubscriptionContext.Provider>
  );
}
