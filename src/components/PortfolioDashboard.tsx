"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { CRYPTO_TICKERS, DEFAULT_INVESTMENT_GROWTH_RATE } from "@/lib/constants";
import Sparkline from "./Sparkline";
import { MaskedValue } from "./PrivacyProvider";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TrackedInvestment {
  id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  avgCost: number;
  recurringAmount: number;
  recurringDay: number;
  createdAt: string;
}

interface PriceData {
  symbol: string;
  type: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  sparkline: number[];
}

interface PortfolioRow extends TrackedInvestment {
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  sparkline: number[];
  marketValue: number;
  totalGain: number;
  totalGainPercent: number;
}

export default function PortfolioDashboard({ onTotalChange, investmentGrowthRate }: { onTotalChange?: (total: number) => void; investmentGrowthRate?: number }) {
  const [investments, setInvestments] = useState<TrackedInvestment[]>([]);
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"STOCK" | "CRYPTO" | "MANUAL">("STOCK");
  const [newShares, setNewShares] = useState("");
  const [newAvgCost, setNewAvgCost] = useState("");
  const [newRecurringAmount, setNewRecurringAmount] = useState("");
  const [newRecurringDay, setNewRecurringDay] = useState("-1");

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editShares, setEditShares] = useState("");
  const [editAvgCost, setEditAvgCost] = useState("");
  const [editRecurringAmount, setEditRecurringAmount] = useState("");
  const [editRecurringDay, setEditRecurringDay] = useState("-1");

  const fetchPrices = useCallback(async (invs: TrackedInvestment[]) => {
    if (invs.length === 0) {
      setRows([]);
      return;
    }

    setPricesLoading(true);

    // Separate MANUAL investments from ones that need price fetching
    const priceableInvs = invs.filter((i) => i.type !== "MANUAL");

    let prices: PriceData[] = [];

    if (priceableInvs.length > 0) {
      const symbols = priceableInvs.map((i) => (i.type === "CRYPTO" ? i.symbol.toLowerCase() : i.symbol)).join(",");
      const types = priceableInvs.map((i) => i.type).join(",");

      try {
        const res = await fetch(`/api/portfolio/prices?symbols=${symbols}&types=${types}`);
        prices = await res.json();
      } catch {
        // Keep empty prices on error
      }
    }

    const merged = invs.map((inv) => {
      if (inv.type === "MANUAL") {
        // For MANUAL investments with recurring contributions, compound at 7% annually
        const startBalance = inv.avgCost * inv.shares;
        const growthRate = investmentGrowthRate ?? DEFAULT_INVESTMENT_GROWTH_RATE;
        const weeklyRate = Math.pow(1 + growthRate, 1 / 52) - 1;
        const weeksElapsed = Math.max(
          0,
          Math.floor((Date.now() - new Date(inv.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
        );

        let balance = startBalance;
        for (let w = 0; w < weeksElapsed; w++) {
          balance *= 1 + weeklyRate;
          if (inv.recurringAmount > 0) {
            balance += inv.recurringAmount;
          }
        }

        const totalContributed = startBalance + inv.recurringAmount * weeksElapsed;
        const totalGain = balance - totalContributed;
        const totalGainPercent = totalContributed > 0 ? (totalGain / totalContributed) * 100 : 0;

        return {
          ...inv,
          price: balance,
          change: 0,
          changePercent: 0,
          dayHigh: 0,
          dayLow: 0,
          sparkline: [],
          marketValue: balance,
          totalGain,
          totalGainPercent,
        };
      }

      const priceKey = inv.type === "CRYPTO" ? inv.symbol.toUpperCase() : inv.symbol;
      const p = prices.find((pd) => pd.symbol === priceKey) || {
        price: 0, change: 0, changePercent: 0, dayHigh: 0, dayLow: 0, sparkline: [],
      };
      const marketValue = p.price * inv.shares;
      const costBasis = inv.avgCost * inv.shares;
      const totalGain = marketValue - costBasis;
      const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;

      return {
        ...inv,
        price: p.price,
        change: p.change,
        changePercent: p.changePercent,
        dayHigh: p.dayHigh,
        dayLow: p.dayLow,
        sparkline: p.sparkline,
        marketValue,
        totalGain,
        totalGainPercent,
      };
    });

    setRows(merged);
    setLastUpdated(new Date());
    setPricesLoading(false);
  }, [investmentGrowthRate]);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        setInvestments(data);
        setLoading(false);
        fetchPrices(data);
      });
  }, [fetchPrices]);

  useEffect(() => {
    if (investments.length === 0) return;
    const interval = setInterval(() => fetchPrices(investments), 60000);
    return () => clearInterval(interval);
  }, [investments, fetchPrices]);

  async function addInvestment() {
    if (!newSymbol || !newName) return;
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: newType === "CRYPTO" ? newSymbol.toLowerCase() : newSymbol.toUpperCase(),
          name: newName,
          type: newType,
          shares: parseFloat(newShares) || 0,
          avgCost: parseFloat(newAvgCost) || 0,
          recurringAmount: parseFloat(newRecurringAmount) || 0,
          recurringDay: parseInt(newRecurringDay),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to add investment. Please try again.");
        return;
      }
      const inv = await res.json();
      const updated = [inv, ...investments];
      setInvestments(updated);
      setNewSymbol("");
      setNewName("");
      setNewShares("");
      setNewAvgCost("");
      setNewRecurringAmount("");
      setNewRecurringDay("-1");
      setShowAdd(false);
      fetchPrices(updated);
    } catch {
      alert("Failed to add investment. Please try again.");
    }
  }

  function startEdit(inv: TrackedInvestment) {
    setEditId(inv.id);
    setEditShares(inv.shares ? inv.shares.toString() : "");
    setEditAvgCost(inv.avgCost ? inv.avgCost.toString() : "");
    setEditRecurringAmount(inv.recurringAmount ? inv.recurringAmount.toString() : "");
    setEditRecurringDay(inv.recurringDay.toString());
  }

  async function saveEdit() {
    if (!editId) return;
    const inv = investments.find((i) => i.id === editId);
    if (!inv) return;

    const res = await fetch("/api/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editId,
        symbol: inv.symbol,
        name: inv.name,
        type: inv.type,
        shares: parseFloat(editShares) || 0,
        avgCost: parseFloat(editAvgCost) || 0,
        recurringAmount: parseFloat(editRecurringAmount) || 0,
        recurringDay: parseInt(editRecurringDay),
      }),
    });
    const updated = await res.json();
    const newInvestments = investments.map((i) => (i.id === updated.id ? updated : i));
    setInvestments(newInvestments);
    setEditId(null);
    fetchPrices(newInvestments);
  }

  async function removeInvestment(id: string) {
    await fetch("/api/portfolio", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const updated = investments.filter((i) => i.id !== id);
    setInvestments(updated);
    setRows(rows.filter((r) => r.id !== id));
  }

  const totalMarketValue = rows.reduce((sum, r) => sum + r.marketValue, 0);

  useEffect(() => {
    if (onTotalChange && rows.length > 0) {
      onTotalChange(totalMarketValue);
    }
  }, [totalMarketValue, onTotalChange, rows.length]);

  if (loading) {
    return <div className="text-slate-400 py-4">Loading portfolio...</div>;
  }

  const totalCostBasis = rows.reduce((sum, r) => sum + r.avgCost * r.shares, 0);
  const totalGain = totalMarketValue - totalCostBasis;
  const totalDayChange = rows.reduce((sum, r) => sum + r.change * r.shares, 0);
  const totalWeeklyRecurring = investments.reduce(
    (sum, i) => sum + (i.recurringDay >= 0 ? i.recurringAmount : 0), 0
  );

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-200">Investment Portfolio</h3>
            <span className="text-[10px] font-semibold bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded">PRO</span>
          </div>
          {lastUpdated && (
            <p className="text-xs text-slate-500 mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()} {pricesLoading && "(refreshing...)"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPrices(investments)}
            disabled={pricesLoading}
            className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 px-2 py-1 rounded"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
          <div className="flex gap-2 flex-wrap items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "STOCK" | "CRYPTO" | "MANUAL")}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              >
                <option value="STOCK">Stock</option>
                <option value="CRYPTO">Crypto</option>
                <option value="MANUAL">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {newType === "STOCK" ? "Ticker" : newType === "CRYPTO" ? "CoinGecko ID" : "Label"}
              </label>
              <input
                type="text"
                placeholder={newType === "STOCK" ? "e.g. AAPL" : newType === "CRYPTO" ? "e.g. bitcoin" : "e.g. ROTH-IRA"}
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm w-36 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                placeholder="Display name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm w-32 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Shares/Coins</label>
              <input
                type="number"
                placeholder="0"
                step="any"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm w-24 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Avg Cost</label>
              <input
                type="number"
                placeholder="0"
                step="0.01"
                value={newAvgCost}
                onChange={(e) => setNewAvgCost(e.target.value)}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm w-24 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Weekly $</label>
              <input
                type="number"
                placeholder="0"
                step="0.01"
                value={newRecurringAmount}
                onChange={(e) => setNewRecurringAmount(e.target.value)}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm w-24 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Buy Day</label>
              <select
                value={newRecurringDay}
                onChange={(e) => setNewRecurringDay(e.target.value)}
                className="border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              >
                <option value="-1">None</option>
                {DAYS.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addInvestment}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-slate-500 hover:text-slate-300 px-2 text-sm"
            >
              Cancel
            </button>
          </div>
          {newType === "CRYPTO" && (
            <p className="text-xs text-slate-500 mt-2">
              For crypto, use the CoinGecko ID (e.g. &quot;bitcoin&quot;, &quot;ethereum&quot;, &quot;solana&quot;, &quot;dogecoin&quot;)
            </p>
          )}
        </div>
      )}

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-6 py-3 bg-slate-900 border-b border-slate-700 text-sm">
          <div>
            <span className="text-slate-400">Total Value: </span>
            <MaskedValue value={formatCurrency(totalMarketValue)} className="font-semibold text-emerald-600" />
          </div>
          <div>
            <span className="text-slate-400">Total Gain: </span>
            <MaskedValue value={`${totalGain >= 0 ? "+" : ""}${formatCurrency(totalGain)}`} className={`font-semibold ${totalGain >= 0 ? "text-emerald-600" : "text-red-500"}`} />
          </div>
          <div>
            <span className="text-slate-400">Day Change: </span>
            <MaskedValue value={`${totalDayChange >= 0 ? "+" : ""}${formatCurrency(totalDayChange)}`} className={`font-semibold ${totalDayChange >= 0 ? "text-emerald-600" : "text-red-500"}`} />
          </div>
          {totalWeeklyRecurring > 0 && (
            <div>
              <span className="text-slate-400">Weekly Auto-Invest: </span>
              <MaskedValue value={formatCurrency(totalWeeklyRecurring)} className="font-semibold text-indigo-600" />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase">
                <th className="px-6 py-3">Name</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Day Change</th>
                <th className="px-3 py-3">Chart</th>
                <th className="px-3 py-3">Shares</th>
                <th className="px-3 py-3">Mkt Value</th>
                <th className="px-3 py-3">Total Gain</th>
                <th className="px-3 py-3">Auto-Invest</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isUp = row.change >= 0;
                const gainIsUp = row.totalGain >= 0;

                return (
                  <tr key={row.id} className="border-b border-slate-700 hover:bg-slate-700">
                    <td className="px-6 py-3">
                      <Link href={`/investment/${row.id}`} className="hover:underline">
                        <div className="font-medium text-slate-100">{row.name}</div>
                        <div className="text-xs text-slate-500">
                          {row.type === "CRYPTO"
                            ? `${CRYPTO_TICKERS[row.symbol] || row.symbol.toUpperCase()} · Crypto`
                            : row.type === "MANUAL"
                            ? "Manual"
                            : `${row.symbol} · Stock`}
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-100">
                      {row.type === "MANUAL" ? "—" : row.price > 0 ? <MaskedValue value={formatCurrency(row.price)} /> : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.type === "MANUAL" ? "—" : row.price > 0 ? (
                        <div className={isUp ? "text-emerald-600" : "text-red-500"}>
                          <MaskedValue value={`${isUp ? "+" : ""}${formatCurrency(row.change)}`} className="font-medium" />
                          <MaskedValue value={`${isUp ? "+" : ""}${row.changePercent.toFixed(2)}%`} className="text-xs block" isCurrency={false} />
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.type === "MANUAL" ? "—" : (
                        <Link href={`/investment/${row.id}`}>
                          <Sparkline data={row.sparkline} color={isUp ? "#10b981" : "#ef4444"} />
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {row.type === "MANUAL" ? "—" : row.shares > 0 ? <MaskedValue value={row.shares.toLocaleString(undefined, { maximumFractionDigits: 6 })} isCurrency={false} /> : "—"}
                    </td>
                    <td className="px-3 py-3 font-medium text-emerald-600">
                      {row.type === "MANUAL"
                        ? <MaskedValue value={formatCurrency(row.marketValue)} />
                        : row.shares > 0 && row.price > 0
                        ? <MaskedValue value={formatCurrency(row.marketValue)} />
                        : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.shares > 0 && row.avgCost > 0 ? (
                        <div className={gainIsUp ? "text-emerald-600" : "text-red-500"}>
                          <MaskedValue value={`${gainIsUp ? "+" : ""}${formatCurrency(row.totalGain)}`} className="font-medium" />
                          <MaskedValue value={`${gainIsUp ? "+" : ""}${row.totalGainPercent.toFixed(2)}%`} className="text-xs block" isCurrency={false} />
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {row.recurringDay >= 0 && row.recurringAmount > 0 ? (
                        <div className="text-indigo-600">
                          <MaskedValue value={formatCurrency(row.recurringAmount)} className="font-medium" />
                          <div className="text-indigo-400">{DAYS[row.recurringDay].slice(0, 3)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(row)}
                          className="text-slate-500 hover:text-slate-300 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeInvestment(row.id)}
                          className="text-red-400 hover:text-red-600 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-slate-400 text-sm">
          No investments tracked yet. Click &quot;+ Add&quot; to start tracking stocks or crypto.
        </div>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-semibold text-slate-100 text-lg mb-4">
              Edit {investments.find((i) => i.id === editId)?.name}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Shares / Coins Owned</label>
                <input
                  type="number"
                  step="any"
                  value={editShares}
                  onChange={(e) => setEditShares(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Average Cost Per Share/Coin</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAvgCost}
                  onChange={(e) => setEditAvgCost(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                />
              </div>
              <hr className="border-slate-700" />
              <p className="text-xs text-slate-400 font-semibold uppercase">Weekly Auto-Invest</p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount Per Week ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editRecurringAmount}
                  onChange={(e) => setEditRecurringAmount(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Day of Week (when it leaves your account)</label>
                <select
                  value={editRecurringDay}
                  onChange={(e) => setEditRecurringDay(e.target.value)}
                  className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                >
                  <option value="-1">No recurring investment</option>
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={saveEdit}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditId(null)}
                className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-lg text-sm hover:bg-slate-700"
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
