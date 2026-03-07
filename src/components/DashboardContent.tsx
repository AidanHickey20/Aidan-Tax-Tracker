"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatWeekLabel, CATEGORIES } from "@/lib/utils";
import IncomeExpenseChart from "./IncomeExpenseChart";
import PortfolioDashboard from "./PortfolioDashboard";

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

  const ytdOwnerDraws = allLineItems
    .filter((i) => i.category === "OWNER_DRAW")
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

  const statCards = [
    { label: "YTD Income", value: formatCurrency(ytdIncome), color: "text-emerald-600" },
    { label: "YTD Business Expenses", value: formatCurrency(ytdBusinessExpenses), color: "text-red-500" },
    { label: "Est. Taxable Profit", value: formatCurrency(estimatedTaxableProfit), color: estimatedTaxableProfit >= 0 ? "text-emerald-600" : "text-red-500" },
    { label: "YTD Personal Expenses", value: formatCurrency(ytdPersonalExpenses), color: "text-orange-500" },
    { label: "YTD Owner Draws", value: formatCurrency(ytdOwnerDraws), color: "text-blue-500" },
    { label: "Total Mileage", value: `${totalMileage.toLocaleString()} mi`, color: "text-purple-500" },
    { label: "Total Investments", value: formatCurrency(totalInvestments), color: "text-indigo-500" },
    { label: "Weeks Tracked", value: entries.length.toString(), color: "text-slate-700" },
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
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm"
          >
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
              {card.label}
            </p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

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
        <PortfolioDashboard />
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
                <span className="font-semibold text-slate-800">
                  {formatCurrency(b.balance)}
                </span>
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
