"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "@/components/PrivacyProvider";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useSubscription } from "@/components/SubscriptionProvider";

const STEP_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DEMO: "Demo",
  RENOVATION: "Renovation",
  LISTING: "Listing",
  UNDER_CONTRACT: "Under Contract",
  CLOSED: "Closed",
};

const EXPENSE_CATEGORIES = [
  "ACQUISITION", "DEMO", "MATERIALS", "LABOR", "PERMITS", "UTILITIES", "INSURANCE", "CLOSING", "OTHER",
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
  PERMITS: "bg-slate-200 text-slate-700",
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

export default function DealDetailPage() {
  const { isProUser, loading: subLoading } = useSubscription();
  const params = useParams();
  const dealId = params.id as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  // Expense form
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("MATERIALS");

  // Edit fields
  const [editPurchase, setEditPurchase] = useState("");
  const [editArv, setEditArv] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  const fetchDeal = useCallback(async () => {
    const res = await fetch("/api/deals");
    if (!res.ok) return;
    const deals: Deal[] = await res.json();
    const found = deals.find((d) => d.id === dealId);
    if (found) {
      setDeal(found);
      setEditPurchase(found.purchasePrice.toString());
      setEditArv(found.arv.toString());
      setEditNotes(found.notes);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  async function toggleStep(step: DealStep) {
    await fetch("/api/deals/steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: step.id, completed: !step.completed }),
    });
    fetchDeal();
  }

  async function addExpense() {
    if (!expDesc || !expAmount) return;
    const res = await fetch("/api/deals/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expDesc,
        amount: parseFloat(expAmount),
        category: expCategory,
        dealId,
      }),
    });
    if (res.ok) {
      const expense = await res.json();
      setDeal((d) => d ? { ...d, expenses: [...d.expenses, expense] } : d);
      setExpDesc("");
      setExpAmount("");
    }
  }

  async function deleteExpense(expenseId: string) {
    await fetch("/api/deals/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: expenseId }),
    });
    setDeal((d) => d ? { ...d, expenses: d.expenses.filter((e) => e.id !== expenseId) } : d);
  }

  async function saveDealInfo() {
    if (!deal) return;
    const res = await fetch("/api/deals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: deal.id,
        address: deal.address,
        nickname: deal.nickname,
        purchasePrice: parseFloat(editPurchase) || 0,
        arv: parseFloat(editArv) || 0,
        status: deal.status,
        notes: editNotes,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDeal(updated);
      setShowEdit(false);
    }
  }

  if (loading || subLoading) return <div className="text-slate-400 py-8">Loading deal...</div>;
  if (!isProUser) return <div className="max-w-2xl mx-auto mt-12"><UpgradePrompt feature="Deal Tracker" /></div>;
  if (!deal) return <div className="text-slate-400 py-8">Deal not found.</div>;

  const totalSpent = deal.expenses.reduce((s, e) => s + e.amount, 0);
  const totalAllIn = deal.purchasePrice + totalSpent;
  const projectedProfit = deal.arv > 0 ? deal.arv - totalAllIn : 0;
  const completedSteps = deal.steps.filter((s) => s.completed).length;
  const totalSteps = deal.steps.length || 6;
  const progressPct = (completedSteps / totalSteps) * 100;

  // Group expenses by category
  const expensesByCategory: Record<string, { total: number; items: DealExpense[] }> = {};
  for (const exp of deal.expenses) {
    if (!expensesByCategory[exp.category]) {
      expensesByCategory[exp.category] = { total: 0, items: [] };
    }
    expensesByCategory[exp.category].total += exp.amount;
    expensesByCategory[exp.category].items.push(exp);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/deals" className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">
            {deal.nickname || deal.address}
          </h2>
          {deal.nickname && <p className="text-sm text-slate-500">{deal.address}</p>}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          deal.status === "CLOSED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
        }`}>
          {STEP_LABELS[deal.status] || deal.status}
        </span>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase mb-1">Purchase Price</p>
          <MaskedValue value={formatCurrency(deal.purchasePrice)} className="text-xl font-bold text-slate-800 block" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase mb-1">Rehab Spent</p>
          <MaskedValue value={formatCurrency(totalSpent)} className="text-xl font-bold text-red-500 block" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase mb-1">All-In Cost</p>
          <MaskedValue value={formatCurrency(totalAllIn)} className="text-xl font-bold text-slate-800 block" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase mb-1">
            {deal.arv > 0 ? "Projected Profit" : "ARV"}
          </p>
          {deal.arv > 0 ? (
            <MaskedValue
              value={formatCurrency(projectedProfit)}
              className={`text-xl font-bold block ${projectedProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}
            />
          ) : (
            <span className="text-xl font-bold text-slate-300 block">Not set</span>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-700 mb-3">Progress</h3>
        <div className="w-full bg-slate-100 rounded-full h-3 mb-4 overflow-hidden">
          <div
            className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {deal.steps.map((step) => (
            <button
              key={step.id}
              onClick={() => toggleStep(step)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                step.completed
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-white border-slate-200 hover:border-emerald-200"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step.completed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
              }`}>
                {step.completed ? "✓" : step.sortOrder + 1}
              </div>
              <span className={`text-xs font-medium ${step.completed ? "text-emerald-700" : "text-slate-500"}`}>
                {STEP_LABELS[step.name] || step.name}
              </span>
              {step.completedAt && (
                <span className="text-[10px] text-slate-400">
                  {new Date(step.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add Expense */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-700 mb-3">Add Expense</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="What was this for?"
            value={expDesc}
            onChange={(e) => setExpDesc(e.target.value)}
            className="flex-1 min-w-[180px] border border-slate-300 rounded px-3 py-2 text-sm"
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
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Spending by Category */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">Spending by Category</h3>
          {Object.keys(expensesByCategory).length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(expensesByCategory)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([cat, data]) => {
                  const barPct = totalSpent > 0 ? (data.total / totalSpent) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[cat]}`}>
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <MaskedValue value={formatCurrency(data.total)} className="text-sm font-semibold text-slate-700" />
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="text-sm font-semibold text-slate-700">Total Rehab</span>
                <MaskedValue value={formatCurrency(totalSpent)} className="text-sm font-bold text-red-500" />
              </div>
            </div>
          )}
        </div>

        {/* All Expenses List */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">All Expenses</h3>
          {deal.expenses.length === 0 ? (
            <p className="text-sm text-slate-400">No expenses yet.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {[...deal.expenses]
                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                .map((exp) => (
                  <div key={exp.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-slate-50 text-sm border-b border-slate-50">
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-700">{exp.description}</span>
                      <span className="text-xs text-slate-400 ml-2">
                        {new Date(exp.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${CATEGORY_COLORS[exp.category]}`}>
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                    <MaskedValue value={formatCurrency(exp.amount)} className="font-semibold text-slate-700 whitespace-nowrap" />
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

      {/* Deal Info / Notes */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-700">Deal Info & Notes</h3>
          {!showEdit ? (
            <button
              onClick={() => setShowEdit(true)}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={saveDealInfo}
                className="text-sm bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowEdit(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {showEdit ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Purchase Price</label>
              <input
                type="number"
                value={editPurchase}
                onChange={(e) => setEditPurchase(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">ARV</label>
              <input
                type="number"
                value={editArv}
                onChange={(e) => setEditArv(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm resize-none"
                placeholder="Notes about this deal..."
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-600 space-y-1">
            <p>
              <span className="text-slate-400">Started:</span>{" "}
              {new Date(deal.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            {deal.closedAt && (
              <p>
                <span className="text-slate-400">Closed:</span>{" "}
                {new Date(deal.closedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            {deal.notes ? (
              <p className="mt-2 text-slate-600 whitespace-pre-wrap">{deal.notes}</p>
            ) : (
              <p className="text-slate-400 italic">No notes yet. Click Edit to add some.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
