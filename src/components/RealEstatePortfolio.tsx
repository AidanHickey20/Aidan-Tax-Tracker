"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { MaskedValue } from "./PrivacyProvider";
import { useSubscription } from "./SubscriptionProvider";
import AddressAutocomplete from "./AddressAutocomplete";

interface Property {
  id: string;
  address: string;
  nickname: string;
  purchasePrice: number;
  currentValue: number;
  appreciationRate: number;
  mortgageBalance: number;
  mortgageRate: number;
  mortgagePayment: number;
  mortgageTerm: number;
  startDate: string;
}

interface PropertyWithCalcs extends Property {
  marketValue: number;
  currentMortgageBalance: number;
  equity: number;
  monthlyPrincipal: number;
  monthlyInterest: number;
  monthsElapsed: number;
}

/** Convert 0 or falsy numbers to empty string for form display */
function numToForm(val: number): string {
  return val ? val.toString() : "";
}

function calcProperty(p: Property): PropertyWithCalcs {
  const start = new Date(p.startDate);
  const now = new Date();
  const monthsElapsed = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  );

  // Market value with appreciation
  const marketValue = p.currentValue * Math.pow(1 + p.appreciationRate / 12, monthsElapsed);

  // Amortize mortgage forward from startDate
  let balance = p.mortgageBalance;
  const monthlyRate = p.mortgageRate / 12;

  for (let i = 0; i < monthsElapsed; i++) {
    if (balance <= 0) break;
    const interest = balance * monthlyRate;
    const principal = Math.min(p.mortgagePayment - interest, balance);
    balance -= principal;
  }
  balance = Math.max(balance, 0);

  // Current month's split
  const currentInterest = balance * monthlyRate;
  const currentPrincipal = Math.min(p.mortgagePayment - currentInterest, balance);

  return {
    ...p,
    marketValue,
    currentMortgageBalance: balance,
    equity: marketValue - balance,
    monthlyPrincipal: Math.max(currentPrincipal, 0),
    monthlyInterest: Math.max(currentInterest, 0),
    monthsElapsed,
  };
}

export default function RealEstatePortfolio({ onEquityChange }: { onEquityChange?: (equity: number) => void }) {
  const { canEdit } = useSubscription();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Form state — all empty strings by default so no zeros to fight
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [appreciationRate, setAppreciationRate] = useState("");
  const [mortgageBalance, setMortgageBalance] = useState("");
  const [mortgageRate, setMortgageRate] = useState("");
  const [mortgagePayment, setMortgagePayment] = useState("");
  const [mortgageTerm, setMortgageTerm] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/properties")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setProperties(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function resetForm() {
    setAddress("");
    setNickname("");
    setPurchasePrice("");
    setCurrentValue("");
    setAppreciationRate("");
    setMortgageBalance("");
    setMortgageRate("");
    setMortgagePayment("");
    setMortgageTerm("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEditId(null);
    setShowForm(false);
    setError("");
  }

  function openEdit(p: Property) {
    setAddress(p.address);
    setNickname(p.nickname);
    setPurchasePrice(numToForm(p.purchasePrice));
    setCurrentValue(numToForm(p.currentValue));
    setAppreciationRate(numToForm(p.appreciationRate));
    setMortgageBalance(numToForm(p.mortgageBalance));
    setMortgageRate(numToForm(p.mortgageRate));
    setMortgagePayment(numToForm(p.mortgagePayment));
    setMortgageTerm(numToForm(p.mortgageTerm));
    setStartDate(new Date(p.startDate).toISOString().split("T")[0]);
    setEditId(p.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit() {
    if (!address) {
      setError("Address is required.");
      return;
    }
    setError("");

    const payload = {
      ...(editId ? { id: editId } : {}),
      address,
      nickname,
      purchasePrice: parseFloat(purchasePrice) || 0,
      currentValue: parseFloat(currentValue) || 0,
      appreciationRate: parseFloat(appreciationRate) || 0.03,
      mortgageBalance: parseFloat(mortgageBalance) || 0,
      mortgageRate: parseFloat(mortgageRate) || 0,
      mortgagePayment: parseFloat(mortgagePayment) || 0,
      mortgageTerm: parseInt(mortgageTerm) || 360,
      startDate,
    };

    try {
      const res = await fetch("/api/properties", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save property");
        return;
      }

      const saved = await res.json();

      if (editId) {
        setProperties((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      } else {
        setProperties((prev) => [saved, ...prev]);
        // Auto-expand the newly added property
        setExpanded(saved.id);
      }
      resetForm();
    } catch {
      setError("Failed to save property. Please try again.");
    }
  }

  async function deleteProperty(id: string) {
    try {
      const res = await fetch("/api/properties", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
        if (expanded === id) setExpanded(null);
      }
    } catch {}
  }

  const calcs = properties.map(calcProperty);
  const totalEquity = calcs.reduce((sum, p) => sum + p.equity, 0);
  const totalMarketValue = calcs.reduce((sum, p) => sum + p.marketValue, 0);
  const totalDebt = calcs.reduce((sum, p) => sum + p.currentMortgageBalance, 0);

  useEffect(() => {
    onEquityChange?.(totalEquity);
  }, [totalEquity, onEquityChange]);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm p-6">
        <div className="text-slate-500 text-center py-4">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200">Real Estate Portfolio</h3>
            <span className="text-[10px] font-semibold bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded">PRO</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { if (showForm && !editId) { resetForm(); } else { resetForm(); setShowForm(true); } }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            {showForm && !editId ? "Cancel" : "+ Add Property"}
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {calcs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-slate-700 bg-slate-900/50">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Market Value</p>
            <MaskedValue value={formatCurrency(totalMarketValue)} className="text-lg font-bold text-slate-100 block" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Debt</p>
            <MaskedValue value={formatCurrency(totalDebt)} className="text-lg font-bold text-red-500 block" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Total Equity</p>
            <MaskedValue value={formatCurrency(totalEquity)} className={`text-lg font-bold block ${totalEquity >= 0 ? "text-emerald-600" : "text-red-500"}`} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
          <h4 className="font-medium text-slate-200 mb-3">{editId ? "Edit Property" : "Add Property"}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs text-slate-400 mb-1">Address *</label>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, City, ST 12345"
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nickname</label>
              <input
                type="text"
                placeholder='e.g. "Rental #1"'
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Purchase Price</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="1000"
                  placeholder="350000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Current Market Value</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="1000"
                  placeholder="400000"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Annual Appreciation Rate</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.03 = 3%"
                  value={appreciationRate}
                  onChange={(e) => setAppreciationRate(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mortgage Balance</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="100"
                  placeholder="280000"
                  value={mortgageBalance}
                  onChange={(e) => setMortgageBalance(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mortgage Interest Rate</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.001"
                  placeholder="0.07 = 7%"
                  value={mortgageRate}
                  onChange={(e) => setMortgageRate(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Monthly Payment</label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">$</span>
                <input
                  type="number"
                  step="1"
                  placeholder="1850"
                  value={mortgagePayment}
                  onChange={(e) => setMortgagePayment(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">/mo</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tracking Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSubmit}
              className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {editId ? "Save Changes" : "Add Property"}
            </button>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Properties List */}
      {calcs.length === 0 && !showForm ? (
        <div className="px-6 py-12 text-center text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <p className="text-sm">No properties yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700">
          {calcs.map((p) => {
            const isOpen = expanded === p.id;
            const payoffPct = p.marketValue > 0
              ? ((p.marketValue - p.currentMortgageBalance) / p.marketValue) * 100
              : 100;

            return (
              <div key={p.id}>
                {/* Row — always shows name, bar, equity, and action buttons */}
                <div className="px-6 py-4 flex items-center gap-4">
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-100 truncate">
                        {p.nickname || p.address}
                      </p>
                      {p.nickname && (
                        <span className="text-xs text-slate-500 truncate hidden sm:inline">{p.address}</span>
                      )}
                    </div>
                    {/* Equity bar */}
                    <div className="mt-2 w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{ width: `${Math.min(Math.max(payoffPct, 0), 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-slate-500">
                        {payoffPct.toFixed(0)}% equity
                      </span>
                      <span className="text-xs text-slate-500">
                        <MaskedValue value={formatCurrency(p.currentMortgageBalance)} className="inline" /> remaining
                      </span>
                    </div>
                  </button>

                  <div className="text-right flex-shrink-0">
                    <MaskedValue value={formatCurrency(p.equity)} className={`text-lg font-bold ${p.equity >= 0 ? "text-emerald-600" : "text-red-500"} block`} />
                    <span className="text-xs text-slate-500">equity</span>
                  </div>

                  {/* Always-visible action buttons */}
                  {canEdit && (
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProperty(p.id)}
                        className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 px-2.5 py-1 rounded-md transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="flex-shrink-0"
                  >
                    <svg
                      className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-6 pb-5 border-t border-slate-700 bg-slate-900/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Market Value</p>
                        <MaskedValue value={formatCurrency(p.marketValue)} className="text-sm font-semibold text-slate-100 block mt-0.5" />
                        <p className="text-xs text-slate-500">
                          +{(p.appreciationRate * 100).toFixed(1)}%/yr
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Purchase Price</p>
                        <MaskedValue value={formatCurrency(p.purchasePrice)} className="text-sm font-semibold text-slate-100 block mt-0.5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Mortgage Balance</p>
                        <MaskedValue value={formatCurrency(p.currentMortgageBalance)} className="text-sm font-semibold text-red-500 block mt-0.5" />
                        {p.mortgageRate > 0 && (
                          <p className="text-xs text-slate-500">
                            {(p.mortgageRate * 100).toFixed(2)}% rate
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Monthly Payment</p>
                        <MaskedValue value={formatCurrency(p.mortgagePayment)} className="text-sm font-semibold text-slate-100 block mt-0.5" />
                      </div>
                    </div>

                    {/* Principal vs Interest Breakdown */}
                    {p.mortgageRate > 0 && p.mortgagePayment > 0 && (
                      <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-3">
                          This Month&apos;s Payment Breakdown
                        </p>
                        <div className="flex items-center gap-4">
                          {/* Stacked bar */}
                          <div className="flex-1">
                            <div className="w-full h-6 rounded-full overflow-hidden flex bg-slate-700">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{
                                  width: `${p.mortgagePayment > 0
                                    ? (p.monthlyPrincipal / p.mortgagePayment) * 100
                                    : 0}%`,
                                }}
                              />
                              <div
                                className="h-full bg-red-400 transition-all"
                                style={{
                                  width: `${p.mortgagePayment > 0
                                    ? (p.monthlyInterest / p.mortgagePayment) * 100
                                    : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-4 flex-shrink-0 text-sm">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                              <span className="text-slate-300">
                                Principal: <MaskedValue value={formatCurrency(p.monthlyPrincipal)} className="font-semibold text-emerald-600 inline" />
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-400" />
                              <span className="text-slate-300">
                                Interest: <MaskedValue value={formatCurrency(p.monthlyInterest)} className="font-semibold text-red-500 inline" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-slate-500">
                      Tracking since {new Date(p.startDate).toLocaleDateString()} ({p.monthsElapsed} months)
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
