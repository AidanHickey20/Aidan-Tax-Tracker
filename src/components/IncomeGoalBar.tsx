"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "./PrivacyProvider";

const INCOME_GOAL = 150000;

export default function IncomeGoalBar() {
  const [ytdIncome, setYtdIncome] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/entries?yearOnly=true")
      .then((r) => r.json())
      .then((entries) => {
        const total = entries
          .flatMap((e: { lineItems: { category: string; amount: number }[] }) => e.lineItems)
          .filter((i: { category: string }) => i.category === "INCOME")
          .reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
        setYtdIncome(total);
      });

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      fetch("/api/entries?yearOnly=true")
        .then((r) => r.json())
        .then((entries) => {
          const total = entries
            .flatMap((e: { lineItems: { category: string; amount: number }[] }) => e.lineItems)
            .filter((i: { category: string }) => i.category === "INCOME")
            .reduce((sum: number, i: { amount: number }) => sum + i.amount, 0);
          setYtdIncome(total);
        });
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const income = ytdIncome ?? 0;
  const pct = Math.min((income / INCOME_GOAL) * 100, 100);
  const remaining = INCOME_GOAL - income;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {new Date().getFullYear()} Income Goal
          </span>
          <span className="text-xs text-slate-400">
            <MaskedValue value={formatCurrency(income)} className="font-semibold text-emerald-600" />
            <span className="text-slate-400"> of </span>
            <MaskedValue value={formatCurrency(INCOME_GOAL)} className="font-semibold text-slate-600" />
          </span>
        </div>
        <span className="text-xs text-slate-400">
          <MaskedValue
            value={remaining > 0 ? `${formatCurrency(remaining)} to go` : "Goal reached!"}
            className={remaining > 0 ? "text-slate-500" : "font-semibold text-emerald-600"}
          />
          <span className="ml-2 font-semibold text-slate-600">{pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
