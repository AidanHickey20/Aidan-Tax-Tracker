"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import Sparkline from "./Sparkline";

interface TrackedInvestment {
  id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  avgCost: number;
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

export default function PortfolioDashboard() {
  const [investments, setInvestments] = useState<TrackedInvestment[]>([]);
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Add investment form
  const [showAdd, setShowAdd] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"STOCK" | "CRYPTO">("STOCK");
  const [newShares, setNewShares] = useState("");
  const [newAvgCost, setNewAvgCost] = useState("");

  const fetchPrices = useCallback(async (invs: TrackedInvestment[]) => {
    if (invs.length === 0) {
      setRows([]);
      return;
    }

    setPricesLoading(true);
    const symbols = invs.map((i) => i.type === "CRYPTO" ? i.symbol.toLowerCase() : i.symbol).join(",");
    const types = invs.map((i) => i.type).join(",");

    try {
      const res = await fetch(`/api/portfolio/prices?symbols=${symbols}&types=${types}`);
      const prices: PriceData[] = await res.json();

      const merged = invs.map((inv) => {
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
    } catch {
      // Keep existing rows on error
    }
    setPricesLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        setInvestments(data);
        setLoading(false);
        fetchPrices(data);
      });
  }, [fetchPrices]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (investments.length === 0) return;
    const interval = setInterval(() => fetchPrices(investments), 60000);
    return () => clearInterval(interval);
  }, [investments, fetchPrices]);

  async function addInvestment() {
    if (!newSymbol || !newName) return;
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: newType === "CRYPTO" ? newSymbol.toLowerCase() : newSymbol.toUpperCase(),
        name: newName,
        type: newType,
        shares: parseFloat(newShares) || 0,
        avgCost: parseFloat(newAvgCost) || 0,
      }),
    });
    const inv = await res.json();
    const updated = [inv, ...investments];
    setInvestments(updated);
    setNewSymbol("");
    setNewName("");
    setNewShares("");
    setNewAvgCost("");
    setShowAdd(false);
    fetchPrices(updated);
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

  if (loading) {
    return <div className="text-slate-400 py-4">Loading portfolio...</div>;
  }

  const totalMarketValue = rows.reduce((sum, r) => sum + r.marketValue, 0);
  const totalCostBasis = rows.reduce((sum, r) => sum + r.avgCost * r.shares, 0);
  const totalGain = totalMarketValue - totalCostBasis;
  const totalDayChange = rows.reduce((sum, r) => sum + r.change * r.shares, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-700">Investment Portfolio</h3>
          {lastUpdated && (
            <p className="text-xs text-slate-400 mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()} {pricesLoading && "(refreshing...)"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPrices(investments)}
            disabled={pricesLoading}
            className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded"
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
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex gap-2 flex-wrap">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as "STOCK" | "CRYPTO")}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="STOCK">Stock</option>
              <option value="CRYPTO">Crypto</option>
            </select>
            <input
              type="text"
              placeholder={newType === "STOCK" ? "Ticker (e.g. AAPL)" : "CoinGecko ID (e.g. bitcoin)"}
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44"
            />
            <input
              type="text"
              placeholder="Display name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36"
            />
            <input
              type="number"
              placeholder="Shares/Coins"
              step="any"
              value={newShares}
              onChange={(e) => setNewShares(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28"
            />
            <input
              type="number"
              placeholder="Avg Cost"
              step="0.01"
              value={newAvgCost}
              onChange={(e) => setNewAvgCost(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28"
            />
            <button
              onClick={addInvestment}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="text-slate-400 hover:text-slate-600 px-2 text-sm"
            >
              Cancel
            </button>
          </div>
          {newType === "CRYPTO" && (
            <p className="text-xs text-slate-400 mt-2">
              For crypto, use the CoinGecko ID (e.g. &quot;bitcoin&quot;, &quot;ethereum&quot;, &quot;solana&quot;, &quot;dogecoin&quot;)
            </p>
          )}
        </div>
      )}

      {/* Summary bar */}
      {rows.length > 0 && (
        <div className="flex gap-6 px-6 py-3 bg-slate-50 border-b border-slate-100 text-sm">
          <div>
            <span className="text-slate-500">Total Value: </span>
            <span className="font-semibold text-slate-800">{formatCurrency(totalMarketValue)}</span>
          </div>
          <div>
            <span className="text-slate-500">Total Gain: </span>
            <span className={`font-semibold ${totalGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Day Change: </span>
            <span className={`font-semibold ${totalDayChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {totalDayChange >= 0 ? "+" : ""}{formatCurrency(totalDayChange)}
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs text-slate-500 uppercase">
                <th className="px-6 py-3">Name</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Day Change</th>
                <th className="px-3 py-3">Chart</th>
                <th className="px-3 py-3">Shares</th>
                <th className="px-3 py-3">Mkt Value</th>
                <th className="px-3 py-3">Total Gain</th>
                <th className="px-3 py-3">Day Range</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isUp = row.change >= 0;
                const gainIsUp = row.totalGain >= 0;
                return (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-400">
                        {row.symbol} &middot; {row.type === "CRYPTO" ? "Crypto" : "Stock"}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {row.price > 0 ? formatCurrency(row.price) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.price > 0 ? (
                        <div className={isUp ? "text-emerald-600" : "text-red-500"}>
                          <div className="font-medium">
                            {isUp ? "+" : ""}{formatCurrency(row.change)}
                          </div>
                          <div className="text-xs">
                            {isUp ? "+" : ""}{row.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Sparkline
                        data={row.sparkline}
                        color={isUp ? "#10b981" : "#ef4444"}
                      />
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {row.shares > 0 ? row.shares.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {row.shares > 0 && row.price > 0 ? formatCurrency(row.marketValue) : "—"}
                    </td>
                    <td className="px-3 py-3">
                      {row.shares > 0 && row.avgCost > 0 ? (
                        <div className={gainIsUp ? "text-emerald-600" : "text-red-500"}>
                          <div className="font-medium">
                            {gainIsUp ? "+" : ""}{formatCurrency(row.totalGain)}
                          </div>
                          <div className="text-xs">
                            {gainIsUp ? "+" : ""}{row.totalGainPercent.toFixed(2)}%
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">
                      {row.dayLow > 0 && row.dayHigh > 0 ? (
                        <div>
                          <div>L: {formatCurrency(row.dayLow)}</div>
                          <div>H: {formatCurrency(row.dayHigh)}</div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => removeInvestment(row.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
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
    </div>
  );
}
