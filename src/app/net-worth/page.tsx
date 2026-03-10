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

interface Settings {
  bankBalance: number;
  homeValue: number;
  homeAppreciation: number;
  mortgageBalance: number;
  mortgageRate: number;
  mortgagePayment: number;
  studentLoanBalance: number;
  studentLoanRate: number;
  studentLoanPayment: number;
  carLoanBalance: number;
  carLoanRate: number;
  carLoanPayment: number;
  refDate: string;
}

const CRYPTO_TICKERS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  ripple: "XRP",
  solana: "SOL",
  dogecoin: "DOGE",
};

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

interface RecurringItem {
  id: string;
  amount: number;
  category: string;
  frequency: string;
  isActive: boolean;
  createdAt: string;
}

export default function NetWorthPage() {
  const [investments, setInvestments] = useState<TrackedInvestment[]>([]);
  const [investmentValues, setInvestmentValues] = useState<Record<string, number>>({});
  const [bankBalance, setBankBalance] = useState(0);
  const [recurringImpact, setRecurringImpact] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    let invs: TrackedInvestment[] = [];
    let entries: WeeklyEntry[] = [];
    let recurring: RecurringItem[] = [];
    let s: Settings | null = null;

    try {
      const [invRes, entriesRes, recurringRes, settingsRes] = await Promise.all([
        fetch("/api/portfolio"),
        fetch("/api/entries?yearOnly=true"),
        fetch("/api/recurring"),
        fetch("/api/settings"),
      ]);
      if (invRes.ok) invs = await invRes.json();
      if (entriesRes.ok) entries = await entriesRes.json();
      if (recurringRes.ok) recurring = await recurringRes.json();
      if (settingsRes.ok) s = await settingsRes.json();
    } catch {
      // DB may be unreachable — use defaults
    }

    setInvestments(invs);
    setSettings(s);

    const refDate = s ? new Date(s.refDate) : new Date();
    const bankStart = s?.bankBalance ?? 0;

    // Dynamic bank balance: ref balance + income - expenses - draws
    const allItems = entries.flatMap((e) => e.lineItems);
    const ytdIncome = allItems.filter((i) => i.category === "INCOME").reduce((s, i) => s + i.amount, 0);
    const ytdBizExp = allItems.filter((i) => i.category === "BUSINESS_EXPENSE").reduce((s, i) => s + i.amount, 0);
    const ytdPersonal = allItems.filter((i) => i.category === "PERSONAL_EXPENSE").reduce((s, i) => s + i.amount, 0);
    const ytdDraws = allItems.filter((i) => i.category === "OWNER_DRAW").reduce((s, i) => s + i.amount, 0);

    // Calculate recurring items impact on bank balance
    const now = new Date();
    let recImpact = 0;
    for (const item of recurring) {
      if (!item.isActive || item.category === "INVESTMENT") continue;
      const created = new Date(item.createdAt);
      const start = created > refDate ? created : refDate;
      let occurrences = 0;
      if (item.frequency === "WEEKLY") {
        occurrences = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
      } else {
        occurrences = monthsElapsed(start, now);
      }
      if (occurrences < 0) occurrences = 0;
      const sign = item.category === "INCOME" ? 1 : -1;
      recImpact += sign * item.amount * occurrences;
    }
    setRecurringImpact(recImpact);
    setBankBalance(bankStart + ytdIncome - ytdBizExp - ytdPersonal - ytdDraws + recImpact);

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Dynamic calculations based on current date and user settings ──
  const calcs = useMemo(() => {
    if (!settings) {
      return {
        homeValue: 0, mortgageBalance: 0, homeEquity: 0,
        studentLoanBalance: 0, studentPaidOff: 0, studentMonthsLeft: 0, studentPayoffDate: new Date(),
        carLoanBalance: 0, carPaidOff: 0, carMonthsLeft: 0, carPayoffDate: new Date(),
      };
    }

    const now = new Date();
    const refDate = new Date(settings.refDate);
    const months = monthsElapsed(refDate, now);

    // Home value with monthly appreciation
    const monthlyAppreciation = (settings.homeAppreciation || 0) / 12;
    const homeValue = settings.homeValue > 0
      ? settings.homeValue * Math.pow(1 + monthlyAppreciation, months)
      : 0;

    // Mortgage balance after amortization
    const mortgageBalance = settings.mortgageBalance > 0
      ? amortize(settings.mortgageBalance, settings.mortgageRate, settings.mortgagePayment, months)
      : 0;
    const homeEquity = homeValue - mortgageBalance;

    // Student loan balance
    const studentLoanBal = settings.studentLoanBalance > 0
      ? amortize(settings.studentLoanBalance, settings.studentLoanRate, settings.studentLoanPayment, months)
      : 0;
    const studentPaidOff = settings.studentLoanBalance > 0
      ? ((settings.studentLoanBalance - studentLoanBal) / settings.studentLoanBalance) * 100
      : 0;
    const studentMonthsLeft = settings.studentLoanBalance > 0
      ? monthsToPayoff(studentLoanBal, settings.studentLoanRate, settings.studentLoanPayment)
      : 0;
    const studentPayoffDate = new Date(now.getFullYear(), now.getMonth() + studentMonthsLeft, 1);

    // Car loan balance
    const carLoanBal = settings.carLoanBalance > 0
      ? amortize(settings.carLoanBalance, settings.carLoanRate, settings.carLoanPayment, months)
      : 0;
    const carPaidOff = settings.carLoanBalance > 0
      ? ((settings.carLoanBalance - carLoanBal) / settings.carLoanBalance) * 100
      : 0;
    const carMonthsLeft = settings.carLoanBalance > 0
      ? monthsToPayoff(carLoanBal, settings.carLoanRate, settings.carLoanPayment)
      : 0;
    const carPayoffDate = new Date(now.getFullYear(), now.getMonth() + carMonthsLeft, 1);

    return {
      homeValue, mortgageBalance, homeEquity,
      studentLoanBalance: studentLoanBal, studentPaidOff, studentMonthsLeft, studentPayoffDate,
      carLoanBalance: carLoanBal, carPaidOff, carMonthsLeft, carPayoffDate,
    };
  }, [settings]);

  if (loading) {
    return <div className="text-slate-400 py-8">Loading net worth...</div>;
  }

  const bankStart = settings?.bankBalance ?? 0;
  const totalInvestments = Object.values(investmentValues).reduce((s, v) => s + v, 0);
  const totalAssets = calcs.homeEquity + bankBalance + totalInvestments;
  const totalLiabilities = calcs.studentLoanBalance + calcs.carLoanBalance;
  const netWorth = totalAssets - totalLiabilities;

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const hasHome = (settings?.homeValue ?? 0) > 0;
  const hasStudentLoan = (settings?.studentLoanBalance ?? 0) > 0;
  const hasCarLoan = (settings?.carLoanBalance ?? 0) > 0;
  const hasAnySetup = hasHome || hasStudentLoan || hasCarLoan || bankStart > 0;

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

      {!hasAnySetup && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-blue-800 font-medium mb-2">Set up your financial profile</p>
          <p className="text-sm text-blue-600 mb-4">
            Head to Settings to enter your starting bank balance, home value, loans, and more.
          </p>
          <Link href="/settings" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Go to Settings
          </Link>
        </div>
      )}

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
            {hasHome && (
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Primary Residence (Equity)</span>
                  <MaskedValue value={formatCurrency(calcs.homeEquity)} className="font-semibold text-slate-800" />
                </div>
                <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Home Value ({((settings?.homeAppreciation ?? 0) * 100).toFixed(2)}%/yr appreciation)</span>
                    <MaskedValue value={formatCurrency(calcs.homeValue)} />
                  </div>
                  <div className="flex justify-between">
                    <span>Mortgage Balance</span>
                    <MaskedValue value={`-${formatCurrency(calcs.mortgageBalance)}`} />
                  </div>
                  {(settings?.mortgagePayment ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Monthly Payment</span>
                      <MaskedValue value={`${formatCurrency(settings!.mortgagePayment)}/mo`} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bank */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Bank Accounts</span>
                <MaskedValue value={formatCurrency(bankBalance)} className="font-semibold text-slate-800" />
              </div>
              {bankStart > 0 && (
                <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Starting Balance</span>
                    <MaskedValue value={formatCurrency(bankStart)} />
                  </div>
                  <div className="flex justify-between">
                    <span>YTD weekly entries (income - expenses)</span>
                    <MaskedValue value={formatCurrency(bankBalance - bankStart - recurringImpact)} />
                  </div>
                  {recurringImpact !== 0 && (
                    <div className="flex justify-between">
                      <span>Recurring items impact</span>
                      <MaskedValue value={formatCurrency(recurringImpact)} />
                    </div>
                  )}
                </div>
              )}
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
            {hasStudentLoan && (
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Student Loans</span>
                  <MaskedValue value={formatCurrency(calcs.studentLoanBalance)} className="font-semibold text-red-500" />
                </div>
                <ProgressBar pctPaid={calcs.studentPaidOff} color="bg-emerald-500" />
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>{calcs.studentPaidOff.toFixed(1)}% paid off</span>
                  <span>
                    <MaskedValue value={`${formatCurrency(settings!.studentLoanBalance - calcs.studentLoanBalance)} of ${formatCurrency(settings!.studentLoanBalance)}`} />
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Monthly Payment</span>
                    <MaskedValue value={`${formatCurrency(settings!.studentLoanPayment)}/mo`} />
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Payoff</span>
                    <span>{formatDate(calcs.studentPayoffDate)} ({calcs.studentMonthsLeft} months)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Car Loan */}
            {hasCarLoan && (
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Car Loan</span>
                  <MaskedValue value={formatCurrency(calcs.carLoanBalance)} className="font-semibold text-red-500" />
                </div>
                <ProgressBar pctPaid={calcs.carPaidOff} color="bg-emerald-500" />
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>{calcs.carPaidOff.toFixed(1)}% paid off</span>
                  <span>
                    <MaskedValue value={`${formatCurrency(settings!.carLoanBalance - calcs.carLoanBalance)} of ${formatCurrency(settings!.carLoanBalance)}`} />
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Monthly Payment</span>
                    <MaskedValue value={`${formatCurrency(settings!.carLoanPayment)}/mo`} />
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Payoff</span>
                    <span>{formatDate(calcs.carPayoffDate)} ({calcs.carMonthsLeft} months)</span>
                  </div>
                </div>
              </div>
            )}

            {!hasStudentLoan && !hasCarLoan && (
              <div className="px-6 py-4 text-sm text-slate-400 text-center">
                No liabilities configured. Add them in Settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
