"use client";

import DealTracker from "@/components/DealTracker";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useSubscription } from "@/components/SubscriptionProvider";

export default function DealsPage() {
  const { isProUser, loading } = useSubscription();

  if (loading) return null;
  if (!isProUser) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <UpgradePrompt feature="Deal Tracker" />
      </div>
    );
  }

  return <DealTracker />;
}
