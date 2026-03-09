"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "./PrivacyProvider";

const STEP_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DEMO: "Demo",
  RENOVATION: "Renovation",
  LISTING: "Listing",
  UNDER_CONTRACT: "Under Contract",
  CLOSED: "Closed",
};

const EXPENSE_CATEGORIES = [
  "ACQUISITION",
  "DEMO",
  "MATERIALS",
  "LABOR",
  "PERMITS",
  "UTILITIES",
  "INSURANCE",
  "CLOSING",
  "OTHER",
];

const CATEGORY_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DEMO: "Demo / Cleanup",
  MATERIALS: "Materials",
  LABOR: "Labor / Contractors",
  PERMITS: "Permits & Fees",
  UTILITIES: "Utilities",
  INSURANCE: "Insurance",
  CLOSING: "Closing Costs",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  ACQUISITION: "bg-blue-100 text-blue-700",
  DEMO: "bg-orange-100 text-orange-700",
  MATERIALS: "bg-amber-100 text-amber-700",
  LABOR: "bg-purple-100 text-purple-700",
  PERMITS: "bg-slate-100 text-slate-700",
  UTILITIES: "bg-cyan-100 text-cyan-700",
  INSURANCE: "bg-rose-100 text-rose-700",
  CLOSING: "bg-emerald-100 text-emerald-700",
  OTHER: "bg-gray-100 text-gray-700",
};

interface DealStep {
  id: string;
  name: string;
  completed: boolean;
  completedAt: string | null;
  notes: string;
  sortOrder: number;
}

interface DealExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidAt: string;
}

interface Deal {
  id: string;
  address: string;
  nickname: string;
  purchasePrice: number;
  arv: number;
  status: string;
  notes: string;
  closedAt: string | null;
  createdAt: string;
  expenses: DealExpense[];
  steps: DealStep[];
}

export default function DealTracker() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // New deal form
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [newArv, setNewArv] = useState("");

  // New expense form
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("MATERIALS");

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setDeals(data);
        if (data.length > 0 && !selectedDealId) setSelectedDealId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDealId]);

  const selectedDeal = deals.find((d) => d.id === selectedDealId);

  async function createDeal() {
    if (!newAddress) return;
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: newAddress,
        nickname: newNickname,
        purchasePrice: parseFloat(newPurchasePrice) || 0,
        arv: parseFloat(newArv) || 0,
      }),
    });
    if (!res.ok) return;
    const deal = await res.json();
    setDeals([deal, ...deals]);
    setSelectedDealId(deal.id);
    setShowNewDeal(false);
    setNewAddress("");
    setNewNickname("");
    setNewPurchasePrice("");
    setNewArv("");
  }

  async function toggleStep(step: DealStep) {
    const res = await fetch("/api/deals/steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: step.id, completed: !step.completed }),
    });
    if (!res.ok) return;
    // Refresh deals
    const dealsRes = await fetch("/api/deals");
    if (dealsRes.ok) setDeals(await dealsRes.json());
  }

  async function addExpense() {
    if (!expDesc || !expAmount || !selectedDealId) return;
    const res = await fetch("/api/deals/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expDesc,
        amount: parseFloat(expAmount),
        category: expCategory,
        dealId: selectedDealId,
      }),
    });
    if (!res.ok) return;
    const expense = await res.json();
    setDeals(
      deals.map((d) =>
        d.id === selectedDealId ? { ...d, expenses: [...d.expenses, expense] } : d
      )
    );
    setExpDesc("");
    setExpAmount("");
  }

  async function deleteExpense(expenseId: string) {
    await fetch("/api/deals/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: expenseId }),
    });
    setDeals(
      deals.map((d) =>
        d.id === selectedDealId
          ? { ...d, expenses: d.expenses.filter((e) => e.id !== expenseId) }
          : d
      )
    );
  }

  async function deleteDeal(dealId: string) {
    await fetch("/api/deals", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dealId }),
    });
    const remaining = deals.filter((d) => d.id !== dealId);
    setDeals(remaining);
    setSelectedDealId(remaining[0]?.id || null);
  }

  if (loading) {
    return <div className="text-slate-400 py-8">Loading deals...</div>;
  }

  const totalSpent = selectedDeal?.expenses.reduce((s, e) => s + e.amount, 0) ?? 0;
  const totalAllIn = (selectedDeal?.purchasePrice ?? 0) + totalSpent;
  const projectedProfit = (selectedDeal?.arv ?? 0) - totalAllIn;

  // Group expenses by category
  const expensesByCategory: Record<string, { total: number; items: DealExpense[] }> = {};
  for (const exp of selectedDeal?.expenses ?? []) {
    if (!expensesByCategory[exp.category]) {
      expensesByCategory[exp.category] = { total: 0, items: [] };
    }
    expensesByCategory[exp.category].total += exp.amount;
    expensesByCategory[exp.category].items.push(exp);
  }

  const completedSteps = selectedDeal?.steps.filter((s) => s.completed).length ?? 0;
  const totalSteps = selectedDeal?.steps.length ?? 6;
  const progressPct = (completedSteps / totalSteps) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Deal Tracker</h2>
        <button
          onClick={() => setShowNewDeal(!showNewDeal)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + New Deal
        </button>
      </div>

      {/* New Deal Form */}
      {showNewDeal && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">New Fix & Flip</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Property Address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="col-span-2 border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Nickname (optional)"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <div />
            <input
              type="number"
              placeholder="Purchase Price"
              value={newPurchasePrice}
              onChange={(e) => setNewPurchasePrice(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="ARV (After Repair Value)"
              value={newArv}
              onChange={(e) => setNewArv(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={createDeal}
              className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700"
            >
              Create Deal
            </button>
            <button
              onClick={() => setShowNewDeal(false)}
              className="text-slate-500 px-4 py-2 rounded text-sm hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deal Tabs */}
      {deals.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {deals.map((deal) => (
            <button
              key={deal.id}
              onClick={() => setSelectedDealId(deal.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                deal.id === selectedDealId
                  ? "bg-emerald-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-emerald-300"
              }`}
            >
              {deal.nickname || deal.address}
            </button>
          ))}
        </div>
      )}

      {!selectedDeal ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg mb-2">No deals yet</p>
          <p className="text-sm">Click &quot;+ New Deal&quot; to start tracking your first fix & flip.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Deal Header */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selectedDeal.address}</h3>
                {selectedDeal.nickname && (
                  <p className="text-sm text-slate-500">{selectedDeal.nickname}</p>
                )}
              </div>
              <button
                onClick={() => deleteDeal(selectedDeal.id)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Delete Deal
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Purchase Price</p>
                <MaskedValue
                  value={formatCurrency(selectedDeal.purchasePrice)}
                  className="text-lg font-bold text-slate-800"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total Rehab Spent</p>
                <MaskedValue
                  value={formatCurrency(totalSpent)}
                  className="text-lg font-bold text-red-500"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">All-In Cost</p>
                <MaskedValue
                  value={formatCurrency(totalAllIn)}
                  className="text-lg font-bold text-slate-800"
                />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">
                  {selectedDeal.arv > 0 ? "Projected Profit" : "ARV"}
                </p>
                {selectedDeal.arv > 0 ? (
                  <MaskedValue
                    value={formatCurrency(projectedProfit)}
                    className={`text-lg font-bold ${projectedProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}
                  />
                ) : (
                  <span className="text-lg font-bold text-slate-400">Not set</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Progress</h3>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
              <div
                className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {selectedDeal.steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-center transition-all ${
                    step.completed
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-slate-200 hover:border-emerald-200"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step.completed ? "✓" : step.sortOrder + 1}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      step.completed ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {STEP_LABELS[step.name] || step.name}
                  </span>
                  {step.completedAt && (
                    <span className="text-[10px] text-slate-400">
                      {new Date(step.completedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Add Expense */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-slate-700 mb-3">Add Expense</h3>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Description"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="flex-1 min-w-[150px] border border-slate-300 rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Amount"
                step="0.01"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-28 border border-slate-300 rounded px-3 py-2 text-sm"
              />
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="border border-slate-300 rounded px-3 py-2 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <button
                onClick={addExpense}
                className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-emerald-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Expense Breakdown by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Summary */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-3">Spending by Category</h3>
              {Object.keys(expensesByCategory).length === 0 ? (
                <p className="text-sm text-slate-400">No expenses yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(expensesByCategory)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([cat, data]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[cat] || "bg-gray-100 text-gray-700"}`}
                          >
                            {CATEGORY_LABELS[cat] || cat}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({data.items.length} item{data.items.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                        <MaskedValue
                          value={formatCurrency(data.total)}
                          className="text-sm font-semibold text-slate-700"
                        />
                      </div>
                    ))}
                  <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between">
                    <span className="text-sm font-semibold text-slate-700">Total</span>
                    <MaskedValue
                      value={formatCurrency(totalSpent)}
                      className="text-sm font-bold text-red-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recent Expenses */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold text-slate-700 mb-3">All Expenses</h3>
              {selectedDeal.expenses.length === 0 ? (
                <p className="text-sm text-slate-400">No expenses yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {[...selectedDeal.expenses]
                    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                    .map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 text-sm"
                      >
                        <span className="flex-1 text-slate-700 truncate">{exp.description}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[exp.category] || "bg-gray-100 text-gray-700"}`}
                        >
                          {CATEGORY_LABELS[exp.category] || exp.category}
                        </span>
                        <MaskedValue
                          value={formatCurrency(exp.amount)}
                          className="font-medium text-slate-700 whitespace-nowrap"
                        />
                        <button
                          onClick={() => deleteExpense(exp.id)}
                          className="text-red-300 hover:text-red-500 text-lg leading-none flex-shrink-0"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
