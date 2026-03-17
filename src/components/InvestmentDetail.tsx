"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import InvestmentDetailChart from "./InvestmentDetailChart";

interface TrackedInvestment {
  id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  avgCost: number;
  recurringAmount: number;
  recurringDay: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  price: number;
  shares: number;
  executedAt: string;
}

interface DetailData {
  symbol: string;
  type: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE: number | null;
  forwardPE: number | null;
  dividendYield: number | null;
  beta: number | null;
  eps: number | null;
  targetMeanPrice: number | null;
  recommendationMean: number | null;
  recommendationKey: string | null;
  profitMargins: number | null;
  revenueGrowth: number | null;
  // Crypto-specific
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number | null;
  athDate?: string | null;
  athChangePercent?: number | null;
  atlDate?: string | null;
  priceChange7d?: number | null;
  priceChange30d?: number | null;
  priceChange1y?: number | null;
  chartData: { time: string; price: number }[];
  error?: string;
}

const RANGES = [
  { value: "1d", label: "1D" },
  { value: "5d", label: "5D" },
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "5y", label: "5Y" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return formatCurrency(n);
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function InvestmentDetail({ investmentId }: { investmentId: string }) {
  const [investment, setInvestment] = useState<TrackedInvestment | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [range, setRange] = useState("1mo");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  const fetchDetail = useCallback(async (symbol: string, type: string, r: string) => {
    setChartLoading(true);
    const s = type === "CRYPTO" ? symbol.toLowerCase() : symbol;
    const res = await fetch(`/api/portfolio/detail?symbol=${s}&type=${type}&range=${r}`);
    const data = await res.json();
    setDetail(data);
    setChartLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((all: TrackedInvestment[]) => {
        const inv = all.find((i) => i.id === investmentId);
        if (inv) {
          setInvestment(inv);
          fetchDetail(inv.symbol, inv.type, "1mo");
        }
        setLoading(false);
      });
    fetch(`/api/portfolio/transactions?investmentId=${investmentId}`)
      .then((r) => r.json())
      .then((data) => setTransactions(data))
      .catch(() => {});
  }, [investmentId, fetchDetail]);

  function handleRangeChange(r: string) {
    setRange(r);
    if (investment) fetchDetail(investment.symbol, investment.type, r);
  }

  if (loading) {
    return <div className="text-slate-500 py-12 text-center">Loading...</div>;
  }

  if (!investment) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">Investment not found.</p>
        <Link href="/" className="text-emerald-600 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const isUp = (detail?.change ?? 0) >= 0;
  const color = isUp ? "#10b981" : "#ef4444";

  const marketValue = (detail?.price ?? 0) * investment.shares;
  const costBasis = investment.avgCost * investment.shares;
  const totalGain = marketValue - costBasis;
  const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;

  const fiftyTwoRange = detail ? detail.fiftyTwoWeekLow + detail.fiftyTwoWeekHigh : 0;
  const fiftyTwoPosition = fiftyTwoRange > 0 && detail
    ? ((detail.price - detail.fiftyTwoWeekLow) / (detail.fiftyTwoWeekHigh - detail.fiftyTwoWeekLow)) * 100
    : 0;

  return (
    <div>
      {/* Back link */}
      <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-100">{investment.name}</h1>
            <span className="text-sm bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
              {investment.symbol} &middot; {investment.type === "CRYPTO" ? "Crypto" : "Stock"}
            </span>
          </div>
          {detail && detail.price > 0 && (
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-4xl font-bold text-white">
                {formatCurrency(detail.price)}
              </span>
              <span className={`text-lg font-semibold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                {isUp ? "+" : ""}{formatCurrency(detail.change)} ({isUp ? "+" : ""}{detail.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Recurring badge */}
        {investment.recurringDay >= 0 && investment.recurringAmount > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2 text-right">
            <p className="text-xs text-indigo-500 uppercase font-semibold">Auto-Invest</p>
            <p className="text-lg font-bold text-indigo-700">{formatCurrency(investment.recurringAmount)}</p>
            <p className="text-xs text-indigo-400">Every {DAYS[investment.recurringDay]}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
          <h3 className="font-semibold text-slate-200">Price Chart</h3>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleRangeChange(r.value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  range === r.value
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-4" style={{ height: "450px" }}>
          {chartLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500">Loading chart...</div>
          ) : detail?.chartData ? (
            <InvestmentDetailChart data={detail.chartData} color={color} range={range} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">No data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Holdings Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Your Holdings</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Shares/Coins</span>
              <span className="font-medium text-slate-100">
                {investment.shares.toLocaleString(undefined, { maximumFractionDigits: 8 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Avg Cost</span>
              <span className="font-medium text-slate-100">{formatCurrency(investment.avgCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Cost Basis</span>
              <span className="font-medium text-slate-100">{formatCurrency(costBasis)}</span>
            </div>
            <hr className="border-slate-700" />
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Market Value</span>
              <span className="font-bold text-slate-100">{formatCurrency(marketValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Total Gain/Loss</span>
              <span className={`font-bold ${totalGain >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {totalGain >= 0 ? "+" : ""}{formatCurrency(totalGain)} ({totalGain >= 0 ? "+" : ""}{totalGainPercent.toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Today&apos;s P/L</span>
              <span className={`font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                {isUp ? "+" : ""}{formatCurrency((detail?.change ?? 0) * investment.shares)}
              </span>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-slate-200 mb-4">Market Stats</h3>
          {detail && (
            <div className="space-y-3">
              {detail.open > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Open</span>
                  <span className="font-medium text-slate-100">{formatCurrency(detail.open)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Day Range</span>
                <span className="font-medium text-slate-100">
                  {formatCurrency(detail.dayLow)} - {formatCurrency(detail.dayHigh)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">52-Week Range</span>
                <span className="font-medium text-slate-100">
                  {formatCurrency(detail.fiftyTwoWeekLow)} - {formatCurrency(detail.fiftyTwoWeekHigh)}
                </span>
              </div>
              {/* 52-week position bar */}
              <div className="relative h-2 bg-slate-800 rounded-full">
                <div
                  className="absolute top-0 h-2 w-1.5 bg-slate-800 rounded-full"
                  style={{ left: `${Math.min(Math.max(fiftyTwoPosition, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Volume</span>
                <span className="font-medium text-slate-100">{formatVolume(detail.volume)}</span>
              </div>
              {detail.avgVolume > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Avg Volume</span>
                  <span className="font-medium text-slate-100">{formatVolume(detail.avgVolume)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Market Cap</span>
                <span className="font-medium text-slate-100">{formatLargeNumber(detail.marketCap)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Fundamentals / Crypto Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm p-5">
          <h3 className="font-semibold text-slate-200 mb-4">
            {investment.type === "CRYPTO" ? "Crypto Stats" : "Fundamentals"}
          </h3>
          {detail && investment.type === "STOCK" && (
            <div className="space-y-3">
              {detail.trailingPE != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">P/E (TTM)</span>
                  <span className="font-medium text-slate-100">{detail.trailingPE.toFixed(2)}</span>
                </div>
              )}
              {detail.forwardPE != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Forward P/E</span>
                  <span className="font-medium text-slate-100">{detail.forwardPE.toFixed(2)}</span>
                </div>
              )}
              {detail.eps != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">EPS (TTM)</span>
                  <span className="font-medium text-slate-100">{formatCurrency(detail.eps)}</span>
                </div>
              )}
              {detail.dividendYield != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Dividend Yield</span>
                  <span className="font-medium text-slate-100">{(detail.dividendYield * 100).toFixed(2)}%</span>
                </div>
              )}
              {detail.beta != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Beta</span>
                  <span className="font-medium text-slate-100">{detail.beta.toFixed(2)}</span>
                </div>
              )}
              {detail.profitMargins != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Profit Margin</span>
                  <span className="font-medium text-slate-100">{(detail.profitMargins * 100).toFixed(1)}%</span>
                </div>
              )}
              {detail.revenueGrowth != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Revenue Growth</span>
                  <span className={`font-medium ${detail.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {(detail.revenueGrowth * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              {detail.targetMeanPrice != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Analyst Target</span>
                  <span className="font-medium text-slate-100">{formatCurrency(detail.targetMeanPrice)}</span>
                </div>
              )}
              {detail.recommendationKey && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Rating</span>
                  <span className={`font-medium text-sm px-2 py-0.5 rounded ${
                    detail.recommendationKey === "buy" || detail.recommendationKey === "strong_buy"
                      ? "bg-emerald-900/30 text-emerald-400"
                      : detail.recommendationKey === "sell" || detail.recommendationKey === "strong_sell"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {detail.recommendationKey.replace(/_/g, " ").toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
          {detail && investment.type === "CRYPTO" && (
            <div className="space-y-3">
              {detail.circulatingSupply != null && detail.circulatingSupply > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Circulating Supply</span>
                  <span className="font-medium text-slate-100">
                    {detail.circulatingSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {detail.maxSupply != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">Max Supply</span>
                  <span className="font-medium text-slate-100">
                    {detail.maxSupply.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {detail.athChangePercent != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">From ATH</span>
                  <span className={`font-medium ${detail.athChangePercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {detail.athChangePercent.toFixed(1)}%
                  </span>
                </div>
              )}
              {detail.priceChange7d != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">7d Change</span>
                  <span className={`font-medium ${detail.priceChange7d >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {detail.priceChange7d >= 0 ? "+" : ""}{detail.priceChange7d.toFixed(2)}%
                  </span>
                </div>
              )}
              {detail.priceChange30d != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">30d Change</span>
                  <span className={`font-medium ${detail.priceChange30d >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {detail.priceChange30d >= 0 ? "+" : ""}{detail.priceChange30d.toFixed(2)}%
                  </span>
                </div>
              )}
              {detail.priceChange1y != null && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-400">1y Change</span>
                  <span className={`font-medium ${detail.priceChange1y >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {detail.priceChange1y >= 0 ? "+" : ""}{detail.priceChange1y.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recurring Investment Info */}
      {investment.recurringDay >= 0 && investment.recurringAmount > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-indigo-700 mb-3">Recurring Investment Schedule</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-indigo-400 text-xs uppercase">Amount</p>
              <p className="font-bold text-indigo-800">{formatCurrency(investment.recurringAmount)}/week</p>
            </div>
            <div>
              <p className="text-indigo-400 text-xs uppercase">Day</p>
              <p className="font-bold text-indigo-800">{DAYS[investment.recurringDay]}</p>
            </div>
            <div>
              <p className="text-indigo-400 text-xs uppercase">Monthly Estimate</p>
              <p className="font-bold text-indigo-800">{formatCurrency(investment.recurringAmount * 4.33)}</p>
            </div>
            <div>
              <p className="text-indigo-400 text-xs uppercase">Yearly Estimate</p>
              <p className="font-bold text-indigo-800">{formatCurrency(investment.recurringAmount * 52)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Invest History */}
      {transactions.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-slate-200 mb-4">Auto-Invest History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Shares Acquired</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-700">
                    <td className="py-2 text-slate-200">
                      {new Date(tx.executedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-slate-200">{formatCurrency(tx.amount)}</td>
                    <td className="py-2 text-slate-200">{formatCurrency(tx.price)}</td>
                    <td className="py-2 text-slate-200">
                      {tx.shares.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
