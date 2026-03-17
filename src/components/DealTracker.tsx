"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "./PrivacyProvider";
import Link from "next/link";

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

const PRESET_CONTINGENCIES = ["Inspection", "Appraisal", "Walkthrough"];

type DealType = "FIX_AND_FLIP" | "WHOLESALE" | "REALTOR";

interface DealStep {
  id: string;
  name: string;
  completed: boolean;
  deadline: string | null;
  sortOrder: number;
}

interface DealExpense {
  id: string;
  amount: number;
}

interface Deal {
  id: string;
  dealType: string;
  address: string;
  nickname: string;
  purchasePrice: number;
  arv: number;
  assignmentFee: number;
  underContractDate: string | null;
  targetCloseDate: string | null;
  status: string;
  closedAt: string | null;
  createdAt: string;
  expenses: DealExpense[];
  steps: DealStep[];
}

interface Contingency {
  name: string;
  deadline: string;
}

export default function DealTracker() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState<DealType | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fix & Flip form
  const [ffAddress, setFfAddress] = useState("");
  const [ffNickname, setFfNickname] = useState("");
  const [ffPurchasePrice, setFfPurchasePrice] = useState("");
  const [ffArv, setFfArv] = useState("");
  const [ffInsurance, setFfInsurance] = useState("");
  const [ffCloseDate, setFfCloseDate] = useState("");

  // Wholesale form
  const [wsAddress, setWsAddress] = useState("");
  const [wsNickname, setWsNickname] = useState("");
  const [wsPurchasePrice, setWsPurchasePrice] = useState("");
  const [wsAssignmentFee, setWsAssignmentFee] = useState("");
  const [wsCloseDate, setWsCloseDate] = useState("");

  // Realtor form
  const [rtAddress, setRtAddress] = useState("");
  const [rtNickname, setRtNickname] = useState("");
  const [rtUnderContractDate, setRtUnderContractDate] = useState("");
  const [rtCloseDate, setRtCloseDate] = useState("");
  const [rtContingencies, setRtContingencies] = useState<Contingency[]>([]);
  const [rtCustomName, setRtCustomName] = useState("");
  const [rtCustomDeadline, setRtCustomDeadline] = useState("");

  function togglePresetContingency(name: string) {
    const exists = rtContingencies.find((c) => c.name === name);
    if (exists) {
      setRtContingencies(rtContingencies.filter((c) => c.name !== name));
    } else {
      setRtContingencies([...rtContingencies, { name, deadline: "" }]);
    }
  }

  function updateContingencyDeadline(name: string, deadline: string) {
    setRtContingencies(rtContingencies.map((c) => c.name === name ? { ...c, deadline } : c));
  }

  function addCustomContingency() {
    if (!rtCustomName.trim()) return;
    if (rtContingencies.find((c) => c.name === rtCustomName.trim())) return;
    setRtContingencies([...rtContingencies, { name: rtCustomName.trim(), deadline: rtCustomDeadline }]);
    setRtCustomName("");
    setRtCustomDeadline("");
  }

  function removeContingency(name: string) {
    setRtContingencies(rtContingencies.filter((c) => c.name !== name));
  }

  async function deleteDeal(id: string) {
    if (!confirm("Delete this deal? This cannot be undone.")) return;
    setDeleting(id);
    try {
      const res = await fetch("/api/deals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setDeals(deals.filter((d) => d.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete deal");
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => (r.ok ? r.json() : []))
      .then(setDeals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function resetForms() {
    setFfAddress(""); setFfNickname(""); setFfPurchasePrice(""); setFfArv(""); setFfInsurance(""); setFfCloseDate("");
    setWsAddress(""); setWsNickname(""); setWsPurchasePrice(""); setWsAssignmentFee(""); setWsCloseDate("");
    setRtAddress(""); setRtNickname(""); setRtUnderContractDate(""); setRtCloseDate("");
    setRtContingencies([]); setRtCustomName(""); setRtCustomDeadline("");
    setError("");
  }

  async function createFixAndFlip() {
    if (!ffAddress || !ffPurchasePrice) {
      setError("Address and purchase price are required.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType: "FIX_AND_FLIP",
          address: ffAddress,
          nickname: ffNickname,
          purchasePrice: parseFloat(ffPurchasePrice) || 0,
          arv: parseFloat(ffArv) || 0,
          insurance: parseFloat(ffInsurance) || 0,
          targetCloseDate: ffCloseDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const deal = await res.json();
      setDeals([deal, ...deals]);
      setShowNew(null);
      resetForms();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create deal");
    }
  }

  async function createWholesale() {
    if (!wsAddress || !wsPurchasePrice) {
      setError("Address and purchase price are required.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType: "WHOLESALE",
          address: wsAddress,
          nickname: wsNickname,
          purchasePrice: parseFloat(wsPurchasePrice) || 0,
          assignmentFee: parseFloat(wsAssignmentFee) || 0,
          targetCloseDate: wsCloseDate || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const deal = await res.json();
      setDeals([deal, ...deals]);
      setShowNew(null);
      resetForms();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create deal");
    }
  }

  async function createRealtor() {
    if (!rtAddress) {
      setError("Address is required.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealType: "REALTOR",
          address: rtAddress,
          nickname: rtNickname,
          underContractDate: rtUnderContractDate || undefined,
          targetCloseDate: rtCloseDate || undefined,
          contingencies: rtContingencies.map((c) => ({
            name: c.name,
            deadline: c.deadline || undefined,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const deal = await res.json();
      setDeals([deal, ...deals]);
      setShowNew(null);
      resetForms();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create deal");
    }
  }

  // Sort deals: open deals first (by target close date or created date), then closed
  const sortedDeals = [...deals].sort((a, b) => {
    const aIsClosed = a.status === "CLOSED";
    const bIsClosed = b.status === "CLOSED";
    if (aIsClosed !== bIsClosed) return aIsClosed ? 1 : -1;

    const aDate = a.targetCloseDate || a.closedAt || a.createdAt;
    const bDate = b.targetCloseDate || b.closedAt || b.createdAt;
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  if (loading) {
    return <div className="text-slate-500 py-8">Loading deals...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-100">Deal Tracker</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowNew(showNew === "FIX_AND_FLIP" ? null : "FIX_AND_FLIP"); setError(""); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showNew === "FIX_AND_FLIP"
                ? "bg-amber-600 text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            + Fix & Flip
          </button>
          <button
            onClick={() => { setShowNew(showNew === "WHOLESALE" ? null : "WHOLESALE"); setError(""); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showNew === "WHOLESALE"
                ? "bg-purple-600 text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            + Wholesale
          </button>
          <button
            onClick={() => { setShowNew(showNew === "REALTOR" ? null : "REALTOR"); setError(""); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showNew === "REALTOR"
                ? "bg-cyan-600 text-white"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            + Realtor
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Fix & Flip Form */}
      {showNew === "FIX_AND_FLIP" && (
        <div className="bg-slate-800 border border-amber-700/50 rounded-lg p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400">Fix & Flip</span>
            New Deal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Property Address *</label>
              <input
                type="text"
                placeholder="123 Main St, Cleveland, OH"
                value={ffAddress}
                onChange={(e) => setFfAddress(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nickname (optional)</label>
              <input
                type="text"
                placeholder="e.g., The Bungalow"
                value={ffNickname}
                onChange={(e) => setFfNickname(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Purchase Price *</label>
              <input
                type="number"
                placeholder="0.00"
                value={ffPurchasePrice}
                onChange={(e) => setFfPurchasePrice(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">ARV (After Repair Value)</label>
              <input
                type="number"
                placeholder="0.00"
                value={ffArv}
                onChange={(e) => setFfArv(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Insurance Cost</label>
              <input
                type="number"
                placeholder="0.00"
                value={ffInsurance}
                onChange={(e) => setFfInsurance(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Closing Date</label>
              <input
                type="date"
                value={ffCloseDate}
                onChange={(e) => setFfCloseDate(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createFixAndFlip} className="bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
              Create Deal
            </button>
            <button onClick={() => { setShowNew(null); setError(""); }} className="text-slate-400 px-4 py-2 rounded-lg text-sm hover:text-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wholesale Form */}
      {showNew === "WHOLESALE" && (
        <div className="bg-slate-800 border border-purple-700/50 rounded-lg p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">Wholesale</span>
            New Deal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Property Address *</label>
              <input
                type="text"
                placeholder="456 Oak Ave, Columbus, OH"
                value={wsAddress}
                onChange={(e) => setWsAddress(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nickname (optional)</label>
              <input
                type="text"
                placeholder="e.g., Oak Ave Wholesale"
                value={wsNickname}
                onChange={(e) => setWsNickname(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Purchase Price *</label>
              <input
                type="number"
                placeholder="0.00"
                value={wsPurchasePrice}
                onChange={(e) => setWsPurchasePrice(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assignment Fee</label>
              <input
                type="number"
                placeholder="0.00"
                value={wsAssignmentFee}
                onChange={(e) => setWsAssignmentFee(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Closing Date</label>
              <input
                type="date"
                value={wsCloseDate}
                onChange={(e) => setWsCloseDate(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createWholesale} className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
              Create Deal
            </button>
            <button onClick={() => { setShowNew(null); setError(""); }} className="text-slate-400 px-4 py-2 rounded-lg text-sm hover:text-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Realtor Form */}
      {showNew === "REALTOR" && (
        <div className="bg-slate-800 border border-cyan-700/50 rounded-lg p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-900/30 text-cyan-400">Realtor</span>
            New Deal
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">Property Address *</label>
              <input
                type="text"
                placeholder="789 Elm Dr, Akron, OH"
                value={rtAddress}
                onChange={(e) => setRtAddress(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nickname (optional)</label>
              <input
                type="text"
                placeholder="e.g., The Johnson Listing"
                value={rtNickname}
                onChange={(e) => setRtNickname(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Under Contract Date</label>
              <input
                type="date"
                value={rtUnderContractDate}
                onChange={(e) => setRtUnderContractDate(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Closing Date</label>
              <input
                type="date"
                value={rtCloseDate}
                onChange={(e) => setRtCloseDate(e.target.value)}
                className="w-full border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
          </div>

          {/* Contingencies */}
          <div className="mt-5 border-t border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-3">Contingencies</h4>

            {/* Preset toggles */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_CONTINGENCIES.map((name) => {
                const active = rtContingencies.some((c) => c.name === name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => togglePresetContingency(name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      active
                        ? "bg-cyan-900/40 border-cyan-600 text-cyan-300"
                        : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {active ? "✓ " : "+ "}{name}
                  </button>
                );
              })}
            </div>

            {/* Deadline inputs for selected contingencies */}
            {rtContingencies.length > 0 && (
              <div className="space-y-2 mb-3">
                {rtContingencies.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-200 flex-1">{c.name}</span>
                    <input
                      type="date"
                      value={c.deadline}
                      onChange={(e) => updateContingencyDeadline(c.name, e.target.value)}
                      className="border border-slate-600 rounded px-2 py-1 text-xs bg-slate-800 text-slate-100"
                      placeholder="Deadline"
                    />
                    <button
                      type="button"
                      onClick={() => removeContingency(c.name)}
                      className="text-red-400 hover:text-red-300 text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom contingency input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Custom contingency name"
                value={rtCustomName}
                onChange={(e) => setRtCustomName(e.target.value)}
                className="flex-1 border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
              <input
                type="date"
                value={rtCustomDeadline}
                onChange={(e) => setRtCustomDeadline(e.target.value)}
                className="border border-slate-600 rounded px-3 py-2 text-sm bg-slate-900 text-slate-100"
              />
              <button
                type="button"
                onClick={addCustomContingency}
                className="bg-slate-700 text-slate-200 px-3 py-2 rounded text-sm hover:bg-slate-600"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={createRealtor} className="bg-cyan-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-cyan-700">
              Create Deal
            </button>
            <button onClick={() => { setShowNew(null); setError(""); }} className="text-slate-400 px-4 py-2 rounded-lg text-sm hover:text-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deal List */}
      {sortedDeals.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-lg mb-1">No deals yet</p>
          <p className="text-sm">Click a button above to start tracking your first deal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDeals.map((deal) => {
            const isWholesale = deal.dealType === "WHOLESALE";
            const isRealtor = deal.dealType === "REALTOR";
            const totalSpent = deal.expenses.reduce((s, e) => s + e.amount, 0);
            const allIn = deal.purchasePrice + totalSpent;
            const completedSteps = deal.steps.filter((s) => s.completed).length;
            const totalSteps = deal.steps.length || 6;
            const pct = (completedSteps / totalSteps) * 100;
            const currentStep = deal.steps.find((s) => !s.completed) || deal.steps[deal.steps.length - 1];
            const barColor = isRealtor ? "bg-cyan-500" : isWholesale ? "bg-purple-500" : "bg-emerald-500";

            return (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="block bg-slate-800 border border-slate-700 rounded-lg shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-100">
                        {deal.nickname || deal.address}
                      </h3>
                      {deal.nickname && (
                        <p className="text-sm text-slate-400">{deal.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${DEAL_TYPE_COLORS[deal.dealType] || DEAL_TYPE_COLORS.FIX_AND_FLIP}`}>
                        {DEAL_TYPE_LABELS[deal.dealType] || "Fix & Flip"}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        deal.status === "CLOSED"
                          ? "bg-emerald-900/30 text-emerald-400"
                          : "bg-blue-900/30 text-blue-400"
                      }`}>
                        {getStepLabel(deal.status)}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteDeal(deal.id); }}
                        disabled={deleting === deal.id}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                        title="Delete deal"
                      >
                        {deleting === deal.id ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-700 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mb-4">
                    <span>{completedSteps} of {totalSteps} steps complete</span>
                    <span>Next: {currentStep ? getStepLabel(currentStep.name) : "—"}</span>
                  </div>

                  {/* Stats row */}
                  {isRealtor ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Under Contract</p>
                        <span className="text-sm font-bold text-slate-100">
                          {deal.underContractDate
                            ? new Date(deal.underContractDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Closing Date</p>
                        <span className="text-sm font-bold text-slate-100">
                          {deal.targetCloseDate
                            ? new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Contingencies</p>
                        <span className="text-sm font-bold text-slate-100">
                          {deal.steps.filter((s) => s.name.startsWith("CONTINGENCY:") && s.completed).length}
                          /{deal.steps.filter((s) => s.name.startsWith("CONTINGENCY:")).length} cleared
                        </span>
                      </div>
                    </div>
                  ) : isWholesale ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Purchase</p>
                        <MaskedValue value={formatCurrency(deal.purchasePrice)} className="text-sm font-bold text-slate-100" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Assignment Fee</p>
                        <MaskedValue value={formatCurrency(deal.assignmentFee)} className="text-sm font-bold text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Closing Date</p>
                        <span className="text-sm font-bold text-slate-100">
                          {deal.targetCloseDate
                            ? new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Purchase</p>
                        <MaskedValue value={formatCurrency(deal.purchasePrice)} className="text-sm font-bold text-slate-100" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Rehab Spent</p>
                        <MaskedValue value={formatCurrency(totalSpent)} className="text-sm font-bold text-red-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">All-In</p>
                        <MaskedValue value={formatCurrency(allIn)} className="text-sm font-bold text-slate-100" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">Closing Date</p>
                        <span className="text-sm font-bold text-slate-100">
                          {deal.targetCloseDate
                            ? new Date(deal.targetCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
