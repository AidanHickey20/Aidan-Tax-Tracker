"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "./PrivacyProvider";
import Link from "next/link";

const STEP_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DEMO: "Demo",
  RENOVATION: "Renovation",
  LISTING: "Listing",
  UNDER_CONTRACT: "Under Contract",
  CLOSED: "Closed",
};

interface DealStep {
  id: string;
  name: string;
  completed: boolean;
  sortOrder: number;
}

interface DealExpense {
  id: string;
  amount: number;
}

interface Deal {
  id: string;
  address: string;
  nickname: string;
  purchasePrice: number;
  arv: number;
  status: string;
  createdAt: string;
  expenses: DealExpense[];
  steps: DealStep[];
}

export default function DealTracker() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newPurchasePrice, setNewPurchasePrice] = useState("");
  const [newArv, setNewArv] = useState("");
  const [newInsurance, setNewInsurance] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/deals")
      .then((r) => (r.ok ? r.json() : []))
      .then(setDeals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createDeal() {
    if (!newAddress || !newPurchasePrice) {
      setError("Address and purchase price are required.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: newAddress,
          nickname: newNickname,
          purchasePrice: parseFloat(newPurchasePrice) || 0,
          arv: parseFloat(newArv) || 0,
          insurance: parseFloat(newInsurance) || 0,
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const deal = await res.json();
      setDeals([deal, ...deals]);
      setShowNew(false);
      setNewAddress("");
      setNewNickname("");
      setNewPurchasePrice("");
      setNewArv("");
      setNewInsurance("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create deal");
    }
  }

  if (loading) {
    return <div className="text-slate-400 py-8">Loading deals...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Deal Tracker</h2>
        <button
          onClick={() => setShowNew(!showNew)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + New Deal
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {showNew && (
        <div className="bg-white border border-emerald-200 rounded-lg p-5 shadow-sm mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">New Fix & Flip</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Property Address *</label>
              <input
                type="text"
                placeholder="123 Main St, Cleveland, OH"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nickname (optional)</label>
              <input
                type="text"
                placeholder="e.g., The Bungalow"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Purchase Price *</label>
              <input
                type="number"
                placeholder="0.00"
                value={newPurchasePrice}
                onChange={(e) => setNewPurchasePrice(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">ARV (After Repair Value)</label>
              <input
                type="number"
                placeholder="0.00"
                value={newArv}
                onChange={(e) => setNewArv(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Insurance Cost</label>
              <input
                type="number"
                placeholder="0.00"
                value={newInsurance}
                onChange={(e) => setNewInsurance(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={createDeal}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Create Deal
            </button>
            <button
              onClick={() => { setShowNew(false); setError(""); }}
              className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Deal Bars */}
      {deals.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-lg mb-1">No deals yet</p>
          <p className="text-sm">Click &quot;+ New Deal&quot; to start tracking your first fix & flip.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const totalSpent = deal.expenses.reduce((s, e) => s + e.amount, 0);
            const allIn = deal.purchasePrice + totalSpent;
            const completedSteps = deal.steps.filter((s) => s.completed).length;
            const totalSteps = deal.steps.length || 6;
            const pct = (completedSteps / totalSteps) * 100;
            const currentStep = deal.steps.find((s) => !s.completed) || deal.steps[deal.steps.length - 1];

            return (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="block bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">
                        {deal.nickname || deal.address}
                      </h3>
                      {deal.nickname && (
                        <p className="text-sm text-slate-500">{deal.address}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      deal.status === "CLOSED"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {STEP_LABELS[deal.status] || deal.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mb-4">
                    <span>{completedSteps} of {totalSteps} steps complete</span>
                    <span>Next: {STEP_LABELS[currentStep?.name] || "—"}</span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Purchase</p>
                      <MaskedValue
                        value={formatCurrency(deal.purchasePrice)}
                        className="text-sm font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Rehab Spent</p>
                      <MaskedValue
                        value={formatCurrency(totalSpent)}
                        className="text-sm font-bold text-red-500"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">All-In</p>
                      <MaskedValue
                        value={formatCurrency(allIn)}
                        className="text-sm font-bold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
