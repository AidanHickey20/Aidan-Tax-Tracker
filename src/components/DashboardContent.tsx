"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatWeekLabel } from "@/lib/utils";
import IncomeExpenseChart from "./IncomeExpenseChart";
import PortfolioDashboard from "./PortfolioDashboard";
import { MaskedValue } from "./PrivacyProvider";
import TaxAdvisor from "./TaxAdvisor";

interface LineItem {
  id: string;
  description: string;
  amount: number;
  category: string;
}

interface AccountBalance {
  id: string;
  accountName: string;
  balance: number;
}

interface InvestmentEntry {
  id: string;
  name: string;
  amount: number;
}

interface WeeklyEntry {
  id: string;
  weekStart: string;
  weekEnd: string;
  mileage: number;
  notes: string;
  lineItems: LineItem[];
  accountBalances: AccountBalance[];
  investments: InvestmentEntry[];
}

interface Reminder {
  id: string;
  message: string;
  isActive: boolean;
}

export default function DashboardContent() {
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioTotal, setPortfolioTotal] = useState<number>(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/entries?yearOnly=true").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
    ]).then(([entriesData, remindersData]) => {
      setEntries(entriesData);
      setReminders(remindersData.filter((r: Reminder) => r.isActive));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  const allLineItems = entries.flatMap((e) => e.lineItems);

  const ytdIncome = allLineItems
    .filter((i) => i.category === "INCOME")
    .reduce((sum, i) => sum + i.amount, 0);

  const ytdBusinessExpenses = allLineItems
    .filter((i) => i.category === "BUSINESS_EXPENSE")
    .reduce((sum, i) => sum + i.amount, 0);

  const ytdPersonalExpenses = allLineItems
    .filter((i) => i.category === "PERSONAL_EXPENSE")
    .reduce((sum, i) => sum + i.amount, 0);

  const estimatedTaxableProfit = ytdIncome - ytdBusinessExpenses;

  const totalMileage = entries.reduce((sum, e) => sum + e.mileage, 0);

  const totalInvestments = entries
    .flatMap((e) => e.investments)
    .reduce((sum, i) => sum + i.amount, 0);

  // Get the most recent entry's account balances
  const latestEntry = entries[0];
  const latestBalances = latestEntry?.accountBalances || [];

  // Chart data: weekly income vs expenses
  const chartData = [...entries]
    .reverse()
    .map((entry) => {
      const income = entry.lineItems
        .filter((i) => i.category === "INCOME")
        .reduce((sum, i) => sum + i.amount, 0);
      const expenses = entry.lineItems
        .filter((i) => i.category === "BUSINESS_EXPENSE")
        .reduce((sum, i) => sum + i.amount, 0);
      return {
        week: formatWeekLabel(entry.weekStart, entry.weekEnd),
        Income: income,
        Expenses: expenses,
      };
    });

  // Net worth: dynamic calculations from reference date March 2026
  const bankBalance = 35800;
  const livePortfolio = portfolioTotal || totalInvestments;

  // Home equity: $170k appreciating at 2.35%/yr, mortgage $130k at 7% with $1295/mo
  const refDate = new Date(2026, 2, 1);
  const now = new Date();
  const monthsElapsed = (now.getFullYear() - refDate.getFullYear()) * 12 + (now.getMonth() - refDate.getMonth());
  const homeValue = 170000 * Math.pow(1 + 0.0235 / 12, monthsElapsed);
  let mortBal = 130000;
  for (let i = 0; i < monthsElapsed; i++) {
    if (mortBal <= 0) break;
    mortBal -= Math.min(1295 - mortBal * (0.07 / 12), mortBal);
  }
  const homeEquity = homeValue - Math.max(mortBal, 0);

  // Student loans: $50k at 7.5%, $1205/mo
  let studentBal = 50000;
  for (let i = 0; i < monthsElapsed; i++) {
    if (studentBal <= 0) break;
    studentBal -= Math.min(1205 - studentBal * (0.075 / 12), studentBal);
  }
  studentBal = Math.max(studentBal, 0);

  // Car loan: $13k at 4%, $333/mo
  let carBal = 13000;
  for (let i = 0; i < monthsElapsed; i++) {
    if (carBal <= 0) break;
    carBal -= Math.min(333 - carBal * (0.04 / 12), carBal);
  }
  carBal = Math.max(carBal, 0);

  const estNetWorth = homeEquity + bankBalance + livePortfolio - studentBal - carBal;

  // ── Estimated tax liability for self-employed real estate professional ──
  function estimateTax(netSEIncome: number): number {
    if (netSEIncome <= 0) return 0;

    // Self-employment tax: 15.3% on 92.35% of net SE income (12.4% SS + 2.9% Medicare)
    const seBase = netSEIncome * 0.9235;
    const ssTax = Math.min(seBase, 176100) * 0.124; // 2026 SS wage base ~$176,100
    const medicareTax = seBase * 0.029;
    const seTax = ssTax + medicareTax;

    // AGI after deducting half of SE tax
    const agi = netSEIncome - seTax / 2;

    // QBI deduction (20% of qualified business income for RE professionals)
    const qbiDeduction = netSEIncome * 0.20;

    // Standard deduction 2026 (~$15,700 single)
    const standardDeduction = 15700;
    const taxableIncome = Math.max(agi - standardDeduction - qbiDeduction, 0);

    // 2026 federal brackets (single, estimated)
    let fedTax = 0;
    const brackets = [
      { limit: 11925, rate: 0.10 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ];
    let remaining = taxableIncome;
    let prevLimit = 0;
    for (const b of brackets) {
      const span = b.limit - prevLimit;
      const taxable = Math.min(remaining, span);
      fedTax += taxable * b.rate;
      remaining -= taxable;
      prevLimit = b.limit;
      if (remaining <= 0) break;
    }

    // Ohio state tax (~3.5% effective for this income range)
    const ohioTax = taxableIncome * 0.035;

    // Lyndhurst municipal tax (2.0% on earned income)
    const municipalTax = netSEIncome * 0.02;

    return seTax + fedTax + ohioTax + municipalTax;
  }

  const estimatedTax = estimateTax(estimatedTaxableProfit);

  const statCards = [
    { label: "YTD Income", value: formatCurrency(ytdIncome), color: "text-emerald-600", href: null },
    { label: "YTD Business Expenses", value: formatCurrency(ytdBusinessExpenses), color: "text-red-500", href: null },
    { label: "Est. Taxable Profit", value: formatCurrency(estimatedTaxableProfit), color: estimatedTaxableProfit >= 0 ? "text-emerald-600" : "text-red-500", href: null },
    { label: "YTD Personal Expenses", value: formatCurrency(ytdPersonalExpenses), color: "text-orange-500", href: null },
    { label: "Est. Net Worth", value: formatCurrency(estNetWorth), color: estNetWorth >= 0 ? "text-emerald-600" : "text-red-500", href: "/net-worth" },
    { label: "Total Mileage", value: `${totalMileage.toLocaleString()} mi`, color: "text-purple-500", href: null },
    { label: "Est. Tax Liability", value: formatCurrency(estimatedTax), color: "text-red-500", href: null },
    { label: "Weeks Tracked", value: entries.length.toString(), color: "text-slate-700", href: null },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Dashboard — {new Date().getFullYear()}
      </h2>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">Reminders</h3>
          <ul className="space-y-1">
            {reminders.map((r) => (
              <li key={r.id} className="text-sm text-amber-700 flex items-center gap-2">
                <span>&#8226;</span> {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const isMileage = card.label === "Total Mileage";
          const isCount = card.label === "Weeks Tracked";
          const content = (
            <>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                {card.label}
              </p>
              <MaskedValue
                value={card.value}
                className={`text-2xl font-bold ${card.color} block`}
                isCurrency={!isMileage && !isCount}
              />
            </>
          );

          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
            >
              {content}
            </Link>
          ) : (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* Tax Advisor */}
      <TaxAdvisor />

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
          <h3 className="font-semibold text-slate-700 mb-4">
            Weekly Income vs Business Expenses
          </h3>
          <IncomeExpenseChart data={chartData} />
        </div>
      )}

      {/* Investment Portfolio */}
      <div className="mb-8">
        <PortfolioDashboard onTotalChange={setPortfolioTotal} />
      </div>

      {/* Account Balances Snapshot */}
      {latestBalances.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">
            Account Balances{" "}
            {latestEntry && (
              <span className="text-sm font-normal text-slate-400">
                (as of {formatWeekLabel(latestEntry.weekStart, latestEntry.weekEnd)})
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {latestBalances.map((b) => (
              <div key={b.id} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-3">
                <span className="text-sm text-slate-600">{b.accountName}</span>
                <MaskedValue value={formatCurrency(b.balance)} className="font-semibold text-slate-800" />
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-lg mb-2">No entries yet</p>
          <p className="text-sm">
            Head to <span className="font-semibold">Weekly Entry</span> to log your first week.
          </p>
        </div>
      )}
    </div>
  );
}
