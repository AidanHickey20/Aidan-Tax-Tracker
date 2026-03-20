"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePlaidLink } from "react-plaid-link";
import { useSubscription } from "@/components/SubscriptionProvider";
import UpgradePrompt from "@/components/UpgradePrompt";

interface LinkedBank {
  id: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
}

interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  category: string | null;
  status: string;
}

type Category = "INCOME" | "BUSINESS_EXPENSE" | "PERSONAL_EXPENSE" | "OWNER_DRAW";

const CATEGORIES: { value: Category; label: string; color: string; activeColor: string }[] = [
  { value: "INCOME", label: "Income", color: "border-emerald-700 text-emerald-400", activeColor: "bg-emerald-600 text-white border-emerald-600" },
  { value: "BUSINESS_EXPENSE", label: "Business", color: "border-red-700 text-red-400", activeColor: "bg-red-600 text-white border-red-600" },
  { value: "PERSONAL_EXPENSE", label: "Personal", color: "border-orange-700 text-orange-400", activeColor: "bg-orange-600 text-white border-orange-600" },
  { value: "OWNER_DRAW", label: "Owner Draw", color: "border-blue-700 text-blue-400", activeColor: "bg-blue-600 text-white border-blue-600" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plaid/create-link-token", { method: "POST" })
      .then((r) => r.json())
      .then((data) => setLinkToken(data.linkToken))
      .catch(() => {});
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
        }),
      });
      onSuccess();
    },
  });

  return (
    <button
      onClick={() => open()}
      disabled={!ready}
      className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
    >
      Connect Bank
    </button>
  );
}

export default function BankImportPage() {
  const { isProUser } = useSubscription();
  const [banks, setBanks] = useState<LinkedBank[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [banksRes, txnRes] = await Promise.all([
        fetch("/api/plaid/banks"),
        fetch("/api/bank-transactions?status=PENDING"),
      ]);
      if (banksRes.ok) setBanks(await banksRes.json());
      if (txnRes.ok) setTransactions(await txnRes.json());
    } catch {
      // silently fail on initial load
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isProUser) loadData();
    else setLoading(false);
  }, [isProUser, loadData]);

  const handleSync = async (bankId: string) => {
    setSyncing(bankId);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId }),
      });
      const data = await res.json();
      if (res.ok) {
        // Reload transactions and banks
        await loadData();
        if (data.imported === 0) {
          alert("No new transactions found.");
        }
      }
    } catch {
      // handled
    }
    setSyncing(null);
  };

  const handleDisconnect = async (bankId: string) => {
    if (!confirm("Disconnect this bank? Pending imported transactions will be removed.")) return;
    await fetch("/api/plaid/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId }),
    });
    await loadData();
  };

  const handleCategorize = async (txnId: string, category: Category) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === txnId ? { ...t, category, status: "CATEGORIZED" } : t
      )
    );
    await fetch("/api/bank-transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txnId, category, status: "CATEGORIZED" }),
    });
  };

  const handleSkip = async (txnId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txnId));
    await fetch("/api/bank-transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txnId, category: null, status: "SKIPPED" }),
    });
  };

  const handleApply = async () => {
    setApplying(true);
    const res = await fetch("/api/bank-transactions/apply", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setAppliedCount(data.applied);
      setTransactions((prev) => prev.filter((t) => t.status !== "CATEGORIZED"));
    }
    setApplying(false);
  };

  const categorizedCount = transactions.filter((t) => t.status === "CATEGORIZED").length;
  const pendingCount = transactions.filter((t) => t.status === "PENDING").length;

  if (!isProUser) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-slate-500 hover:text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h2 className="text-2xl font-bold text-slate-100">Bank Import</h2>
        </div>
        <UpgradePrompt feature="Bank Import" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-slate-500 hover:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-100">Bank Import</h2>
      </div>

      {loading ? (
        <p className="text-slate-500 py-8">Loading...</p>
      ) : (
        <div className="space-y-6">
          {/* Connected Banks */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="font-semibold text-slate-200 mb-4">Connected Banks</h3>

            {banks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-slate-400 mb-4">
                  Link your bank account to import transactions and quickly categorize them.
                </p>
                <PlaidLinkButton onSuccess={loadData} />
              </div>
            ) : (
              <div className="space-y-3">
                {banks.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex items-center justify-between bg-slate-900 rounded-lg p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {bank.institutionName || "Bank Account"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bank.lastSyncedAt
                          ? `Last imported: ${new Date(bank.lastSyncedAt).toLocaleDateString()}`
                          : "Never imported"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSync(bank.id)}
                        disabled={syncing === bank.id}
                        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {syncing === bank.id ? "Importing..." : "Import Transactions"}
                      </button>
                      <button
                        onClick={() => handleDisconnect(bank.id)}
                        className="px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <PlaidLinkButton onSuccess={loadData} />
                </div>
              </div>
            )}
          </div>

          {/* Transaction Review */}
          {transactions.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-200">
                  Review Transactions
                  <span className="ml-2 text-sm font-normal text-slate-400">
                    {pendingCount} pending{categorizedCount > 0 && `, ${categorizedCount} categorized`}
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {transactions.map((txn) => {
                  const isInflow = txn.amount < 0;
                  const displayAmount = Math.abs(txn.amount);

                  return (
                    <div
                      key={txn.id}
                      className={`bg-slate-900 rounded-lg p-4 transition-all ${
                        txn.status === "CATEGORIZED" ? "ring-1 ring-emerald-600/50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">
                            {txn.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(txn.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-semibold ${
                              isInflow ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isInflow ? "+" : "-"}
                            {formatCurrency(displayAmount)}
                          </span>
                          <button
                            onClick={() => handleSkip(txn.id)}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            title="Skip this transaction"
                          >
                            Skip
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            onClick={() => handleCategorize(txn.id, cat.value)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              txn.category === cat.value
                                ? cat.activeColor
                                : `${cat.color} hover:opacity-80`
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Apply button */}
              {categorizedCount > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {applying
                      ? "Adding to entries..."
                      : `Add ${categorizedCount} Transaction${categorizedCount !== 1 ? "s" : ""} to Weekly Entries`}
                  </button>
                </div>
              )}

              {appliedCount > 0 && transactions.length === 0 && (
                <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-center">
                  <p className="text-sm text-emerald-400">
                    {appliedCount} transaction{appliedCount !== 1 ? "s" : ""} added to your weekly entries!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state after clearing all */}
          {!loading && transactions.length === 0 && banks.length > 0 && appliedCount === 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm text-center">
              <p className="text-slate-400">
                No pending transactions. Click &quot;Import Transactions&quot; above to pull new ones from your bank.
              </p>
            </div>
          )}

          {appliedCount > 0 && transactions.length === 0 && (
            <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-6 text-center">
              <p className="text-emerald-400 font-medium mb-1">
                {appliedCount} transaction{appliedCount !== 1 ? "s" : ""} added to your weekly entries!
              </p>
              <Link href="/history" className="text-sm text-emerald-500 hover:text-emerald-400 underline">
                View in Past Weeks
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
