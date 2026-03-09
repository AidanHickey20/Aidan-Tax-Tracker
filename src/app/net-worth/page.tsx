"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { MaskedValue } from "@/components/PrivacyProvider";

interface TrackedInvestment {
  id: string;
  symbol: string;
  name: string;
  type: string;
  shares: number;
  avgCost: number;
  recurringAmount: number;
  createdAt: string;
}

interface PriceData {
  symbol: string;
  price: number;
}

const CRYPTO_TICKERS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  ripple: "XRP",
  solana: "SOL",
  dogecoin: "DOGE",
};

// ── Reference date: March 2026 ──
const REF_DATE = new Date(2026, 2, 1); // March 1, 2026

// ── Home ──
const HOME_VALUE_AT_REF = 170000;
const HOME_ANNUAL_APPRECIATION = 0.0235; // Lyndhurst OH 30-yr avg
const MORTGAGE_BALANCE_AT_REF = 130000;
const MORTGAGE_RATE = 0.07; // ~7% (back-calculated from ~$195k orig, $1,295/mo)
const MORTGAGE_PAYMENT = 1295;

// ── Bank ──
const BANK_BALANCE_AT_REF = 35800;

// ── Student Loans ──
const STUDENT_LOAN_AT_REF = 50000;
const STUDENT_LOAN_RATE = 0.075; // ~7.5% (back-calculated from $1,205/mo over 4yr)
const STUDENT_LOAN_PAYMENT = 1205;

// ── Car Loan ──
const CAR_LOAN_AT_REF = 13000;
const CAR_LOAN_RATE = 0.04; // ~4% (back-calculated from $333/mo over 3.5yr)
const CAR_LOAN_PAYMENT = 333;


function monthsElapsed(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function amortize(balance: number, annualRate: number, monthlyPayment: number, months: number): number {
  const r = annualRate / 12;
  let bal = balance;
  for (let i = 0; i < months; i++) {
    if (bal <= 0) return 0;
    const interest = bal * r;
    const principal = Math.min(monthlyPayment - interest, bal);
    bal -= principal;
  }
  return Math.max(bal, 0);
}

function monthsToPayoff(balance: number, annualRate: number, monthlyPayment: number): number {
  const r = annualRate / 12;
  let bal = balance;
  let months = 0;
  while (bal > 0.01 && months < 600) {
    const interest = bal * r;
    const principal = monthlyPayment - interest;
    if (principal <= 0) return Infinity;
    bal -= principal;
    months++;
  }
  return months;
}

function ProgressBar({ pctPaid, color }: { pctPaid: number; color: string }) {
  const clamped = Math.min(Math.max(pctPaid, 0), 100);
  return (
    <div className="w-full bg-slate-100 rounded-full h-4 mt-2 overflow-hidden">
      <div
        className={`h-4 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface LineItem {
  amount: number;
  category: string;
}

interface WeeklyEntry {
  lineItems: LineItem[];
}

export default function NetWorthPage() {
  const [investments, setInvestments] = useState<TrackedInvestment[]>([]);
  const [investmentValues, setInvestmentValues] = useState<Record<string, number>>({});
  const [bankBalance, setBankBalance] = useState(BANK_BALANCE_AT_REF);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    let invs: TrackedInvestment[] = [];
    let entries: WeeklyEntry[] = [];

    try {
      const [invRes, entriesRes] = await Promise.all([
        fetch("/api/portfolio"),
        fetch("/api/entries?yearOnly=true"),
      ]);
      if (invRes.ok) invs = await invRes.json();
      if (entriesRes.ok) entries = await entriesRes.json();
    } catch {
      // DB may be unreachable — use defaults
    }

    setInvestments(invs);

    // Dynamic bank balance: ref balance + income - expenses - draws
    const allItems = entries.flatMap((e) => e.lineItems);
    const ytdIncome = allItems.filter((i) => i.category === "INCOME").reduce((s, i) => s + i.amount, 0);
    const ytdBizExp = allItems.filter((i) => i.category === "BUSINESS_EXPENSE").reduce((s, i) => s + i.amount, 0);
    const ytdPersonal = allItems.filter((i) => i.category === "PERSONAL_EXPENSE").reduce((s, i) => s + i.amount, 0);
    const ytdDraws = allItems.filter((i) => i.category === "OWNER_DRAW").reduce((s, i) => s + i.amount, 0);
    setBankBalance(BANK_BALANCE_AT_REF + ytdIncome - ytdBizExp - ytdPersonal - ytdDraws);

    const priceableInvs = invs.filter((i) => i.type !== "MANUAL");
    const manualInvs = invs.filter((i) => i.type === "MANUAL");

    const values: Record<string, number> = {};
    for (const m of manualInvs) {
      const startBalance = m.avgCost * m.shares;
      const weeklyRate = Math.pow(1 + 0.07, 1 / 52) - 1;
      const weeksElapsed = Math.max(
        0,
        Math.floor((Date.now() - new Date(m.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))
      );
      let balance = startBalance;
      for (let w = 0; w < weeksElapsed; w++) {
        balance *= 1 + weeklyRate;
        if (m.recurringAmount > 0) balance += m.recurringAmount;
      }
      values[m.id] = balance;
    }

    if (priceableInvs.length > 0) {
      const symbols = priceableInvs.map((i) => (i.type === "CRYPTO" ? i.symbol.toLowerCase() : i.symbol)).join(",");
      const types = priceableInvs.map((i) => i.type).join(",");
      const priceRes = await fetch(`/api/portfolio/prices?symbols=${symbols}&types=${types}`);
      const prices: PriceData[] = await priceRes.json();

      for (const inv of priceableInvs) {
        const priceKey = inv.type === "CRYPTO" ? inv.symbol.toUpperCase() : inv.symbol;
        const p = prices.find((pd) => pd.symbol === priceKey);
        values[inv.id] = (p?.price ?? 0) * inv.shares;
      }
    }

    setInvestmentValues(values);
    setLoading(false);
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Dynamic calculations based on current date ──
  const calcs = useMemo(() => {
    const now = new Date();
    const months = monthsElapsed(REF_DATE, now);

    // Home value with monthly appreciation
    const monthlyAppreciation = HOME_ANNUAL_APPRECIATION / 12;
    const homeValue = HOME_VALUE_AT_REF * Math.pow(1 + monthlyAppreciation, months);

    // Mortgage balance after amortization
    const mortgageBalance = amortize(MORTGAGE_BALANCE_AT_REF, MORTGAGE_RATE, MORTGAGE_PAYMENT, months);
    const homeEquity = homeValue - mortgageBalance;

    // Student loan balance
    const studentLoanBalance = amortize(STUDENT_LOAN_AT_REF, STUDENT_LOAN_RATE, STUDENT_LOAN_PAYMENT, months);
    const studentPaidOff = ((STUDENT_LOAN_AT_REF - studentLoanBalance) / STUDENT_LOAN_AT_REF) * 100;
    const studentMonthsLeft = monthsToPayoff(studentLoanBalance, STUDENT_LOAN_RATE, STUDENT_LOAN_PAYMENT);
    const studentPayoffDate = new Date(now.getFullYear(), now.getMonth() + studentMonthsLeft, 1);

    // Car loan balance
    const carLoanBalance = amortize(CAR_LOAN_AT_REF, CAR_LOAN_RATE, CAR_LOAN_PAYMENT, months);
    const carPaidOff = ((CAR_LOAN_AT_REF - carLoanBalance) / CAR_LOAN_AT_REF) * 100;
    const carMonthsLeft = monthsToPayoff(carLoanBalance, CAR_LOAN_RATE, CAR_LOAN_PAYMENT);
    const carPayoffDate = new Date(now.getFullYear(), now.getMonth() + carMonthsLeft, 1);

    return {
      homeValue,
      mortgageBalance,
      homeEquity,
      studentLoanBalance,
      studentPaidOff,
      studentMonthsLeft,
      studentPayoffDate,
      carLoanBalance,
      carPaidOff,
      carMonthsLeft,
      carPayoffDate,
    };
  }, []);

  if (loading) {
    return <div className="text-slate-400 py-8">Loading net worth...</div>;
  }

  const totalInvestments = Object.values(investmentValues).reduce((s, v) => s + v, 0);
  const totalAssets = calcs.homeEquity + bankBalance + totalInvestments;
  const totalLiabilities = calcs.studentLoanBalance + calcs.carLoanBalance;
  const netWorth = totalAssets - totalLiabilities;

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-slate-400 hover:text-slate-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-800">Estimated Net Worth</h2>
      </div>

      {/* Net Worth Hero */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8 text-center">
        <p className="text-sm text-slate-500 uppercase tracking-wide mb-1">Net Worth</p>
        <MaskedValue value={formatCurrency(netWorth)} className={`text-4xl font-bold ${netWorth >= 0 ? "text-emerald-600" : "text-red-500"} block`} />
        <div className="flex justify-center gap-8 mt-4 text-sm">
          <div>
            <span className="text-slate-500">Total Assets: </span>
            <MaskedValue value={formatCurrency(totalAssets)} className="font-semibold text-emerald-600" />
          </div>
          <div>
            <span className="text-slate-500">Total Liabilities: </span>
            <MaskedValue value={formatCurrency(totalLiabilities)} className="font-semibold text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Assets ── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Assets</h3>
            <MaskedValue value={formatCurrency(totalAssets)} className="text-2xl font-bold text-emerald-600 mt-1 block" />
          </div>
          <div className="divide-y divide-slate-50">
            {/* Home */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Primary Residence (Equity)</span>
                <MaskedValue value={formatCurrency(calcs.homeEquity)} className="font-semibold text-slate-800" />
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Home Value (2.35%/yr appreciation)</span>
                  <MaskedValue value={formatCurrency(calcs.homeValue)} />
                </div>
                <div className="flex justify-between">
                  <span>Mortgage Balance</span>
                  <MaskedValue value={`-${formatCurrency(calcs.mortgageBalance)}`} />
                </div>
                <div className="flex justify-between">
                  <span>Monthly Payment</span>
                  <MaskedValue value={`${formatCurrency(MORTGAGE_PAYMENT)}/mo`} />
                </div>
              </div>
            </div>

            {/* Bank */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Bank Accounts</span>
                <MaskedValue value={formatCurrency(bankBalance)} className="font-semibold text-slate-800" />
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Starting Balance (Mar 2026)</span>
                  <MaskedValue value={formatCurrency(BANK_BALANCE_AT_REF)} />
                </div>
                <div className="flex justify-between">
                  <span>Adjusted by YTD income & expenses</span>
                  <MaskedValue value={formatCurrency(bankBalance - BANK_BALANCE_AT_REF)} />
                </div>
              </div>
            </div>

            {/* Investments */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Investment Portfolio</span>
                <MaskedValue value={formatCurrency(totalInvestments)} className="font-semibold text-slate-800" />
              </div>
              <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-100">
                {investments.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">
                      {inv.name}
                      {inv.type === "CRYPTO" && (
                        <span className="text-slate-400 ml-1">({CRYPTO_TICKERS[inv.symbol] || inv.symbol.toUpperCase()})</span>
                      )}
                      {inv.type === "STOCK" && (
                        <span className="text-slate-400 ml-1">({inv.symbol})</span>
                      )}
                    </span>
                    <MaskedValue value={formatCurrency(investmentValues[inv.id] ?? 0)} className="text-slate-600 font-medium" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Liabilities ── */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Liabilities</h3>
            <MaskedValue value={formatCurrency(totalLiabilities)} className="text-2xl font-bold text-red-500 mt-1 block" />
          </div>
          <div className="divide-y divide-slate-50">
            {/* Student Loans */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Student Loans</span>
                <MaskedValue value={formatCurrency(calcs.studentLoanBalance)} className="font-semibold text-red-500" />
              </div>
              <ProgressBar pctPaid={calcs.studentPaidOff} color="bg-emerald-500" />
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>{calcs.studentPaidOff.toFixed(1)}% paid off</span>
                <span>
                  <MaskedValue value={`${formatCurrency(STUDENT_LOAN_AT_REF - calcs.studentLoanBalance)} of ${formatCurrency(STUDENT_LOAN_AT_REF)}`} />
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Monthly Payment</span>
                  <MaskedValue value={`${formatCurrency(STUDENT_LOAN_PAYMENT)}/mo`} />
                </div>
                <div className="flex justify-between">
                  <span>Estimated Payoff</span>
                  <span>{formatDate(calcs.studentPayoffDate)} ({calcs.studentMonthsLeft} months)</span>
                </div>
              </div>
            </div>

            {/* Car Loan */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Car Loan</span>
                <MaskedValue value={formatCurrency(calcs.carLoanBalance)} className="font-semibold text-red-500" />
              </div>
              <ProgressBar pctPaid={calcs.carPaidOff} color="bg-emerald-500" />
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>{calcs.carPaidOff.toFixed(1)}% paid off</span>
                <span>
                  <MaskedValue value={`${formatCurrency(CAR_LOAN_AT_REF - calcs.carLoanBalance)} of ${formatCurrency(CAR_LOAN_AT_REF)}`} />
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Monthly Payment</span>
                  <MaskedValue value={`${formatCurrency(CAR_LOAN_PAYMENT)}/mo`} />
                </div>
                <div className="flex justify-between">
                  <span>Estimated Payoff</span>
                  <span>{formatDate(calcs.carPayoffDate)} ({calcs.carMonthsLeft} months)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
