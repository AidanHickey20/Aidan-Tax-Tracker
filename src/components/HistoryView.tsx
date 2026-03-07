"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatWeekLabel, formatCurrency } from "@/lib/utils";

interface LineItem {
  id: string;
  description: string;
  amount: number;
  category: string;
}

interface AccountBalance {
  id: string;
  accountName: string;
  balance: number;
}

interface InvestmentEntry {
  id: string;
  name: string;
  amount: number;
}

interface WeeklyEntry {
  id: string;
  weekStart: string;
  weekEnd: string;
  mileage: number;
  notes: string;
  lineItems: LineItem[];
  accountBalances: AccountBalance[];
  investments: InvestmentEntry[];
}

export default function HistoryView() {
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/entries")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      });
  }, []);

  async function deleteEntry(id: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries(entries.filter((e) => e.id !== id));
  }

  if (loading) {
    return <div className="text-slate-400 py-12 text-center">Loading history...</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-lg mb-2">No entries yet</p>
        <p className="text-sm">
          Head to <Link href="/entry" className="text-emerald-600 underline">Weekly Entry</Link> to log your first week.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Past Weeks</h2>

      <div className="space-y-3">
        {entries.map((entry) => {
          const income = entry.lineItems
            .filter((i) => i.category === "INCOME")
            .reduce((sum, i) => sum + i.amount, 0);
          const expenses = entry.lineItems
            .filter((i) => i.category === "BUSINESS_EXPENSE")
            .reduce((sum, i) => sum + i.amount, 0);
          const isExpanded = expanded === entry.id;

          return (
            <div
              key={entry.id}
              className="bg-white border border-slate-200 rounded-lg shadow-sm"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : entry.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div>
                  <p className="font-semibold text-slate-700">
                    {formatWeekLabel(entry.weekStart, entry.weekEnd)}
                  </p>
                  <div className="flex gap-4 mt-1 text-sm">
                    <span className="text-emerald-600">
                      Income: {formatCurrency(income)}
                    </span>
                    <span className="text-red-500">
                      Expenses: {formatCurrency(expenses)}
                    </span>
                    {entry.mileage > 0 && (
                      <span className="text-purple-500">
                        {entry.mileage} mi
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-slate-100">
                  {/* Income */}
                  {entry.lineItems.filter((i) => i.category === "INCOME").length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-emerald-600 uppercase mb-1">Income</p>
                      {entry.lineItems
                        .filter((i) => i.category === "INCOME")
                        .map((i) => (
                          <div key={i.id} className="flex justify-between text-sm py-0.5">
                            <span className="text-slate-600">{i.description}</span>
                            <span className="text-slate-800">{formatCurrency(i.amount)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Business Expenses */}
                  {entry.lineItems.filter((i) => i.category === "BUSINESS_EXPENSE").length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-red-500 uppercase mb-1">Business Expenses</p>
                      {entry.lineItems
                        .filter((i) => i.category === "BUSINESS_EXPENSE")
                        .map((i) => (
                          <div key={i.id} className="flex justify-between text-sm py-0.5">
                            <span className="text-slate-600">{i.description}</span>
                            <span className="text-slate-800">{formatCurrency(i.amount)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Personal Expenses */}
                  {entry.lineItems.filter((i) => i.category === "PERSONAL_EXPENSE").length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-orange-500 uppercase mb-1">Personal Expenses</p>
                      {entry.lineItems
                        .filter((i) => i.category === "PERSONAL_EXPENSE")
                        .map((i) => (
                          <div key={i.id} className="flex justify-between text-sm py-0.5">
                            <span className="text-slate-600">{i.description}</span>
                            <span className="text-slate-800">{formatCurrency(i.amount)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Owner Draws */}
                  {entry.lineItems.filter((i) => i.category === "OWNER_DRAW").length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-blue-500 uppercase mb-1">Owner Draws</p>
                      {entry.lineItems
                        .filter((i) => i.category === "OWNER_DRAW")
                        .map((i) => (
                          <div key={i.id} className="flex justify-between text-sm py-0.5">
                            <span className="text-slate-600">{i.description}</span>
                            <span className="text-slate-800">{formatCurrency(i.amount)}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Investments */}
                  {entry.investments.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-indigo-500 uppercase mb-1">Investments</p>
                      {entry.investments.map((inv) => (
                        <div key={inv.id} className="flex justify-between text-sm py-0.5">
                          <span className="text-slate-600">{inv.name}</span>
                          <span className="text-slate-800">{formatCurrency(inv.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Account Balances */}
                  {entry.accountBalances.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Account Balances</p>
                      {entry.accountBalances.map((b) => (
                        <div key={b.id} className="flex justify-between text-sm py-0.5">
                          <span className="text-slate-600">{b.accountName}</span>
                          <span className="text-slate-800">{formatCurrency(b.balance)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {entry.notes && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Notes</p>
                      <p className="text-sm text-slate-600">{entry.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/entry?edit=${entry.id}`}
                      className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-sm bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
