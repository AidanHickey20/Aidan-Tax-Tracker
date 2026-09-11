"use client";

import DocumentVault from "@/components/DocumentVault";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useSubscription } from "@/components/SubscriptionProvider";

export default function DocumentsPage() {
  const { isProUser, loading } = useSubscription();

  if (loading) return null;
  if (!isProUser) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <UpgradePrompt feature="Document Vault" />
      </div>
    );
  }

  return <DocumentVault />;
}
