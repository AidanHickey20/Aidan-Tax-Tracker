"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Txn {
  id: string;
  date: string;
  name: string;
  amount: number; // Plaid: positive = money out (purchase), negative = money in
  category: string | null;
}

type Category = "BUSINESS_EXPENSE" | "PERSONAL_EXPENSE" | "INCOME" | "OWNER_DRAW";

export default function BankReviewQueue() {
  const [queue, setQueue] = useState<Txn[]>([]);
  const [index, setIndex] = useState(0);
  const [remember, setRemember] = useState(true);
  const [open, setOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [decided, setDecided] = useState(0);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/bank-transactions?status=PENDING");
    if (!res.ok) return;
    const data: Txn[] = await res.json();
    if (data.length > 0) {
      setQueue(data);
      setIndex(0);
      setDecided(0);
      setAppliedCount(null);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const current = queue[index];
  const isIncome = current ? current.amount < 0 : false;

  const apply = useCallback(async () => {
    setFinishing(true);
    const res = await fetch("/api/bank-transactions/apply", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setAppliedCount(res.ok ? data.applied ?? 0 : 0);
    setFinishing(false);
  }, []);

  const advance = useCallback(() => {
    if (index + 1 >= queue.length) {
      apply(); // everything reviewed — file the categorized ones
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, queue.length, apply]);

  const decide = useCallback(
    async (category: Category | null, status: "CATEGORIZED" | "SKIPPED") => {
      if (!current) return;
      await fetch("/api/bank-transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, category, status, remember: remember && !!category }),
      });
      if (status === "CATEGORIZED") setDecided((d) => d + 1);
      advance();
    },
    [current, remember, advance]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-800 border border-slate-700 shadow-xl p-6">
        {appliedCount !== null ? (
          // Done screen
          <div className="text-center">
            <p className="text-4xl mb-3">✅</p>
            <h3 className="text-lg font-semibold text-slate-100 mb-1">All caught up</h3>
            <p className="text-sm text-slate-400 mb-6">
              Filed {appliedCount} transaction{appliedCount === 1 ? "" : "s"} into your weekly entries.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg px-5 py-2"
            >
              Done
            </button>
          </div>
        ) : finishing ? (
          <div className="text-center py-8 text-slate-300 text-sm">Filing transactions…</div>
        ) : current ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Review new transactions</h3>
              <span className="text-xs text-slate-500">
                {index + 1} of {queue.length}
              </span>
            </div>

            <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 mb-5">
              <p className="text-base font-semibold text-slate-100">{current.name}</p>
              <p className="text-sm text-slate-400">{new Date(current.date).toLocaleDateString()}</p>
              <p className={`mt-2 text-2xl font-bold ${isIncome ? "text-emerald-400" : "text-slate-100"}`}>
                {isIncome ? "+" : ""}
                {formatCurrency(Math.abs(current.amount))}
              </p>
              <p className="text-xs text-slate-500">{isIncome ? "Money in" : "Purchase"}</p>
            </div>

            <p className="text-sm text-slate-300 mb-2">Was this business or personal?</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                onClick={() => decide("BUSINESS_EXPENSE", "CATEGORIZED")}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-3"
              >
                💼 Business
              </button>
              <button
                onClick={() => decide("PERSONAL_EXPENSE", "CATEGORIZED")}
                className="rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium py-3"
              >
                🏠 Personal
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mb-4 text-xs">
              <button
                onClick={() => decide("INCOME", "CATEGORIZED")}
                className="text-emerald-400 hover:text-emerald-300"
              >
                Mark as income
              </button>
              <button
                onClick={() => decide("OWNER_DRAW", "CATEGORIZED")}
                className="text-slate-400 hover:text-slate-300"
              >
                Owner draw
              </button>
              <button
                onClick={() => decide(null, "SKIPPED")}
                className="text-slate-500 hover:text-slate-300"
              >
                Skip →
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-emerald-500"
              />
              Remember this merchant and auto-sort it next time
            </label>

            {decided > 0 && (
              <p className="mt-4 text-center text-xs text-slate-500">{decided} categorized so far</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
