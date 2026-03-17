"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "@/components/PrivacyProvider";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useSubscription } from "@/components/SubscriptionProvider";

const FIX_FLIP_STEP_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DEMO: "Demo",
  RENOVATION: "Renovation",
  LISTING: "Listing",
  UNDER_CONTRACT: "Under Contract",
  CLOSED: "Closed",
};

const WHOLESALE_STEP_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  FIND_BUYER: "Find Buyer",
  ASSIGNMENT: "Assignment",
  CLOSING: "Closing",
  CLOSED: "Closed",
};

const REALTOR_STEP_LABELS: Record<string, string> = {
  UNDER_CONTRACT: "Under Contract",
  EARNEST_MONEY: "Earnest Money",
  CONTINGENCIES_REMOVED: "Contingencies Removed",
  CLOSING: "Closing",
  CLOSED: "Closed",
};

const ALL_STEP_LABELS: Record<string, string> = {
  ...FIX_FLIP_STEP_LABELS,
  ...WHOLESALE_STEP_LABELS,
  ...REALTOR_STEP_LABELS,
};

function getStepLabel(name: string): string {
  if (name.startsWith("CONTINGENCY:")) return name.slice("CONTINGENCY:".length);
  return ALL_STEP_LABELS[name] || name;
}

const DEAL_TYPE_LABELS: Record<string, string> = {
  FIX_AND_FLIP: "Fix & Flip",
  WHOLESALE: "Wholesale",
  REALTOR: "Realtor",
};

const DEAL_TYPE_COLORS: Record<string, string> = {
  FIX_AND_FLIP: "bg-amber-900/30 text-amber-400",
  WHOLESALE: "bg-purple-900/30 text-purple-400",
  REALTOR: "bg-cyan-900/30 text-cyan-400",
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
  ACQUISITION: "bg-blue-900/30 text-blue-400",
  DEMO: "bg-orange-900/30 text-orange-400",
  MATERIALS: "bg-amber-900/30 text-amber-400",
  LABOR: "bg-purple-900/30 text-purple-400",
  PERMITS: "bg-slate-700 text-slate-200",
  UTILITIES: "bg-cyan-900/30 text-cyan-400",
  INSURANCE: "bg-rose-900/30 text-rose-400",
  CLOSING: "bg-emerald-900/30 text-emerald-400",
  OTHER: "bg-gray-900/30 text-gray-400",
};

interface DealStep {
  id: string;
  name: string;
  completed: boolean;
  completedAt: string | null;
  deadline: string | null;
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
  dealType: string;
  address: string;
  nickname: string;
  purchasePrice: number;
  arv: number;
  assignmentFee: number;
  closedProfit: number;
  underContractDate: string | null;
  targetCloseDate: string | null;
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
  const [editAssignmentFee, setEditAssignmentFee] = useState("");
  const [editUnderContractDate, setEditUnderContractDate] = useState("");
  const [editTargetCloseDate, setEditTargetCloseDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  // Close deal dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeStepId, setCloseStepId] = useState<string | null>(null);
  const [closeProfit, setCloseProfit] = useState("");
  const [closing, setClosing] = useState(false);

  const fetchDeal = useCallback(async () => {
    const res = await fetch("/api/deals");
    if (!res.ok) return;
    const deals: Deal[] = await res.json();
    const found = deals.find((d) => d.id === dealId);
    if (found) {
      setDeal(found);
      setEditPurchase(found.purchasePrice ? found.purchasePrice.toString() : "");
      setEditArv(found.arv ? found.arv.toString() : "");
      setEditAssignmentFee(found.assignmentFee ? found.assignmentFee.toString() : "");
      setEditUnderContractDate(found.underContractDate ? found.underContractDate.split("T")[0] : "");
      setEditTargetCloseDate(found.targetCloseDate ? found.targetCloseDate.split("T")[0] : "");
      setEditNotes(found.notes);
    }
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  async function toggleStep(step: DealStep) {
    // Intercept closing: show profit dialog instead of toggling directly
    if (step.name === "CLOSED" && !step.completed) {
      setCloseStepId(step.id);
      setCloseProfit("");
      setShowCloseDialog(true);
      return;
    }

    await fetch("/api/deals/steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: step.id, completed: !step.completed }),
    });
    fetchDeal();
  }

  async function confirmCloseDeal() {
    if (!closeStepId) return;
    setClosing(true);
    await fetch("/api/deals/steps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: closeStepId,
        completed: true,
        profit: parseFloat(closeProfit) || 0,
      }),
    });
    setShowCloseDialog(false);
    setCloseStepId(null);
    setCloseProfit("");
    setClosing(false);
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
    const isWholesale = deal.dealType === "WHOLESALE";
    const isRealtor = deal.dealType === "REALTOR";
    const res = await fetch("/api/deals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: deal.id,
        address: deal.address,
        nickname: deal.nickname,
        purchasePrice: isRealtor ? deal.purchasePrice : (parseFloat(editPurchase) || 0),
        arv: (isWholesale || isRealtor) ? deal.arv : (parseFloat(editArv) || 0),
        assignmentFee: isWholesale ? (parseFloat(editAssignmentFee) || 0) : deal.assignmentFee,
        underContractDate: isRealtor ? (editUnderContractDate || null) : deal.underContractDate,
        targetCloseDate: editTargetCloseDate || null,
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

  const isWholesale = deal.dealType === "WHOLESALE";
  const isRealtor = deal.dealType === "REALTOR";
  const isFixAndFlip = deal.dealType === "FIX_AND_FLIP";
  const totalSpent = deal.expenses.reduce((s, e) => s + e.amount, 0);
  const totalAllIn = deal.purchasePrice + totalSpent;
  const projectedProfit = isWholesale
    ? deal.assignmentFee
    : (deal.arv > 0 ? deal.arv - totalAllIn : 0);
  const completedSteps = deal.steps.filter((s) => s.completed).length;
  const totalSteps = deal.steps.length || 6;
  const progressPct = (completedSteps / totalSteps) * 100;
  const barColor = isRealtor ? "bg-cyan-500" : isWholesale ? "bg-purple-500" : "bg-emerald-500";
  const accentCompleted = isRealtor ? "bg-cyan-900/30 border-cyan-600" : isWholesale ? "bg-purple-900/30 border-purple-600" : "bg-emerald-900/30 border-emerald-600";
  const accentCircle = isRealtor ? "bg-cyan-500 text-white" : isWholesale ? "bg-purple-500 text-white" : "bg-emerald-500 text-white";
  const accentText = isRealtor ? "text-cyan-400" : isWholesale ? "text-purple-400" : "text-emerald-400";

  // Group expenses by category
  const expensesByCategory: Record<string, { total: number; items: DealExpense[] }> = {};
  for (const exp of deal.expenses) {
    if (!expensesByCategory[exp.category]) {
      expensesByCategory[exp.category] = { total: 0, items: [] };
    }
    expensesByCategory[exp.category].total += exp.amount;
    expensesByCategory[exp.category].items.push(exp);
  }

  // For realtor: count days until closing
  const daysUntilClosing = deal.targetCloseDate
    ? Math.ceil((new Date(deal.targetCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/deals" className="text-slate-500 hover:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-100">
            {deal.nickname || deal.address}
          </h2>
          {deal.nickname && <p className="text-sm text-slate-400">{deal.address}</p>}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DEAL_TYPE_COLORS[deal.dealType] || DEAL_TYPE_COLORS.FIX_AND_FLIP}`}>
          {DEAL_TYPE_LABELS[deal.dealType] || "Fix & Flip"}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          deal.status === "CLOSED" ? "bg-emerald-900/30 text-emerald-400" : "bg-blue-900/30 text-blue-400"
        }`}>
          {getStepLabel(deal.status)}
        </span>
      </div>

      {/* Financial Summary — Realtor */}
      {isRealtor && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Under Contract</p>
            <span className="text-xl font-bold text-slate-100 block">
              {deal.underContractDate
                ? new Date(deal.underContractDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Not set"}
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Closing Date</p>
            <span className="text-xl font-bold text-slate-100 block">
              {deal.targetCloseDate
                ? new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Not set"}
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Days to Close</p>
            <span className={`text-xl font-bold block ${
              daysUntilClosing === null ? "text-slate-500"
                : daysUntilClosing <= 7 ? "text-amber-400"
                : daysUntilClosing <= 0 ? "text-red-400"
                : "text-slate-100"
            }`}>
              {daysUntilClosing !== null ? (daysUntilClosing > 0 ? daysUntilClosing : "Past due") : "—"}
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Contingencies</p>
            <span className="text-xl font-bold text-slate-100 block">
              {deal.steps.filter((s) => s.name.startsWith("CONTINGENCY:") && s.completed).length}
              /{deal.steps.filter((s) => s.name.startsWith("CONTINGENCY:")).length} cleared
            </span>
          </div>
        </div>
      )}

      {/* Financial Summary — Wholesale */}
      {isWholesale && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Purchase Price</p>
            <MaskedValue value={formatCurrency(deal.purchasePrice)} className="text-xl font-bold text-slate-100 block" />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Assignment Fee</p>
            <MaskedValue value={formatCurrency(deal.assignmentFee)} className="text-xl font-bold text-emerald-400 block" />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Closing Date</p>
            <span className="text-xl font-bold text-slate-100 block">
              {deal.targetCloseDate
                ? new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Not set"}
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Profit</p>
            <MaskedValue
              value={formatCurrency(projectedProfit)}
              className={`text-xl font-bold block ${projectedProfit > 0 ? "text-emerald-400" : "text-slate-500"}`}
            />
          </div>
        </div>
      )}

      {/* Financial Summary — Fix & Flip */}
      {isFixAndFlip && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Purchase Price</p>
            <MaskedValue value={formatCurrency(deal.purchasePrice)} className="text-xl font-bold text-slate-100 block" />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Rehab Spent</p>
            <MaskedValue value={formatCurrency(totalSpent)} className="text-xl font-bold text-red-500 block" />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">All-In Cost</p>
            <MaskedValue value={formatCurrency(totalAllIn)} className="text-xl font-bold text-slate-100 block" />
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">
              {deal.arv > 0 ? "Projected Profit" : "ARV"}
            </p>
            {deal.arv > 0 ? (
              <MaskedValue
                value={formatCurrency(projectedProfit)}
                className={`text-xl font-bold block ${projectedProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}
              />
            ) : (
              <span className="text-xl font-bold text-slate-500 block">Not set</span>
            )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-sm">
            <p className="text-xs text-slate-400 uppercase mb-1">Closing Date</p>
            <span className="text-xl font-bold text-slate-100 block">
              {deal.targetCloseDate
                ? new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Not set"}
            </span>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-200 mb-3">Progress</h3>
        <div className="w-full bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {isRealtor ? (
          /* Realtor: vertical timeline-style step list to accommodate variable contingencies */
          <div className="space-y-2">
            {deal.steps.map((step) => {
              const isContingency = step.name.startsWith("CONTINGENCY:");
              const isPastDeadline = step.deadline && !step.completed && new Date(step.deadline) < new Date();
              const isNearDeadline = step.deadline && !step.completed
                && new Date(step.deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                && new Date(step.deadline) >= new Date();

              return (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    step.completed ? accentCompleted : "bg-slate-800 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    step.completed ? accentCircle : "bg-slate-700 text-slate-500"
                  }`}>
                    {step.completed ? "✓" : step.sortOrder + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${step.completed ? accentText : "text-slate-300"}`}>
                        {getStepLabel(step.name)}
                      </span>
                      {isContingency && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/20 text-cyan-500">contingency</span>
                      )}
                    </div>
                    {step.deadline && (
                      <span className={`text-xs ${
                        step.completed ? "text-slate-500"
                          : isPastDeadline ? "text-red-400 font-semibold"
                          : isNearDeadline ? "text-amber-400"
                          : "text-slate-500"
                      }`}>
                        {step.completed ? "Cleared" : isPastDeadline ? "OVERDUE" : "Due"}{" "}
                        {new Date(step.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                    {step.completedAt && (
                      <span className="text-xs text-slate-500 ml-2">
                        Completed {new Date(step.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Fix & Flip / Wholesale: grid layout */
          <div className={`grid gap-2 ${deal.steps.length <= 5 ? "grid-cols-5" : "grid-cols-3 sm:grid-cols-6"}`}>
            {deal.steps.map((step) => (
              <button
                key={step.id}
                onClick={() => toggleStep(step)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
                  step.completed ? accentCompleted : "bg-slate-800 border-slate-700 hover:border-emerald-700"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step.completed ? accentCircle : "bg-slate-700 text-slate-500"
                }`}>
                  {step.completed ? "✓" : step.sortOrder + 1}
                </div>
                <span className={`text-xs font-medium ${step.completed ? accentText : "text-slate-400"}`}>
                  {getStepLabel(step.name)}
                </span>
                {step.completedAt && (
                  <span className="text-[10px] text-slate-500">
                    {new Date(step.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense — show for all types */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-200 mb-3">Add Expense</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="What was this for?"
            value={expDesc}
            onChange={(e) => setExpDesc(e.target.value)}
            className="flex-1 min-w-[180px] border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
          />
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            value={expAmount}
            onChange={(e) => setExpAmount(e.target.value)}
            className="w-28 border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
          />
          <select
            value={expCategory}
            onChange={(e) => setExpCategory(e.target.value)}
            className="border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
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

      {deal.expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Spending by Category */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-slate-200 mb-3">Spending by Category</h3>
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
                        <MaskedValue value={formatCurrency(data.total)} className="text-sm font-semibold text-slate-200" />
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full bg-slate-500" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              <div className="border-t border-slate-700 pt-2 flex justify-between">
                <span className="text-sm font-semibold text-slate-200">Total Spent</span>
                <MaskedValue value={formatCurrency(totalSpent)} className="text-sm font-bold text-red-500" />
              </div>
            </div>
          </div>

          {/* All Expenses List */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold text-slate-200 mb-3">All Expenses</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {[...deal.expenses]
                .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
                .map((exp) => (
                  <div key={exp.id} className="flex items-center gap-2 py-2 px-2 rounded hover:bg-slate-700 text-sm border-b border-slate-700">
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-200">{exp.description}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {new Date(exp.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${CATEGORY_COLORS[exp.category]}`}>
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                    <MaskedValue value={formatCurrency(exp.amount)} className="font-semibold text-slate-200 whitespace-nowrap" />
                    <button
                      onClick={() => deleteExpense(exp.id)}
                      className="text-red-300 hover:text-red-500 text-lg leading-none flex-shrink-0"
                    >
                      &times;
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Deal Info / Notes */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-200">Deal Info & Notes</h3>
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
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
        {showEdit ? (
          <div className="grid grid-cols-2 gap-3">
            {isFixAndFlip && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    value={editPurchase}
                    onChange={(e) => setEditPurchase(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">ARV</label>
                  <input
                    type="number"
                    value={editArv}
                    onChange={(e) => setEditArv(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Closing Date</label>
                  <input
                    type="date"
                    value={editTargetCloseDate}
                    onChange={(e) => setEditTargetCloseDate(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
              </>
            )}
            {isWholesale && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Purchase Price</label>
                  <input
                    type="number"
                    value={editPurchase}
                    onChange={(e) => setEditPurchase(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assignment Fee</label>
                  <input
                    type="number"
                    value={editAssignmentFee}
                    onChange={(e) => setEditAssignmentFee(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Target Closing Date</label>
                  <input
                    type="date"
                    value={editTargetCloseDate}
                    onChange={(e) => setEditTargetCloseDate(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
              </>
            )}
            {isRealtor && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Under Contract Date</label>
                  <input
                    type="date"
                    value={editUnderContractDate}
                    onChange={(e) => setEditUnderContractDate(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Closing Date</label>
                  <input
                    type="date"
                    value={editTargetCloseDate}
                    onChange={(e) => setEditTargetCloseDate(e.target.value)}
                    className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
                  />
                </div>
              </>
            )}
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm resize-none bg-slate-900 text-slate-100 placeholder-slate-500"
                placeholder="Notes about this deal..."
              />
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-300 space-y-1">
            <p>
              <span className="text-slate-500">Started:</span>{" "}
              {new Date(deal.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            {isRealtor && deal.underContractDate && (
              <p>
                <span className="text-slate-500">Under Contract:</span>{" "}
                {new Date(deal.underContractDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            {deal.targetCloseDate && (
              <p>
                <span className="text-slate-500">Closing Date:</span>{" "}
                {new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            {deal.closedAt && (
              <p>
                <span className="text-slate-500">Closed:</span>{" "}
                {new Date(deal.closedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
            {deal.closedProfit > 0 && (
              <p>
                <span className="text-slate-500">Profit:</span>{" "}
                <MaskedValue value={formatCurrency(deal.closedProfit)} className="text-emerald-400 font-semibold" />
              </p>
            )}
            {deal.notes ? (
              <p className="mt-2 text-slate-300 whitespace-pre-wrap">{deal.notes}</p>
            ) : (
              <p className="text-slate-500 italic">No notes yet. Click Edit to add some.</p>
            )}
          </div>
        )}
      </div>

      {/* Close Deal Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Close Deal</h3>
            <p className="text-sm text-slate-400 mb-4">
              Enter your profit from this deal. This will be recorded as income in your weekly entry.
            </p>
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Profit</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={closeProfit}
                onChange={(e) => setCloseProfit(e.target.value)}
                autoFocus
                className="w-full border border-slate-600 rounded px-3 py-2.5 text-lg bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmCloseDeal}
                disabled={closing}
                className="flex-1 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {closing ? "Closing..." : "Close Deal"}
              </button>
              <button
                onClick={() => { setShowCloseDialog(false); setCloseStepId(null); }}
                className="px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
