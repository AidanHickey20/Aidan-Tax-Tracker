"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface LineItem {
  description: string;
  amount: number;
  category: string;
}

interface WeeklyEntry {
  id: string;
  weekStart: string;
  weekEnd: string;
  mileage: number;
  lineItems: LineItem[];
}

export default function ExportPage() {
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [mileageRate, setMileageRate] = useState(0.70);
  const [loading, setLoading] = useState(true);
  const [year] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([
      fetch("/api/entries?yearOnly=true").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([entriesData, settingsData]) => {
      setEntries(entriesData);
      if (settingsData.mileageRate) setMileageRate(settingsData.mileageRate);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-slate-500 py-8">Loading...</div>;
  }

  const allItems = entries.flatMap((e) => e.lineItems);

  const ytdIncome = allItems
    .filter((i) => i.category === "INCOME")
    .reduce((sum, i) => sum + i.amount, 0);
  const ytdBusinessExpenses = allItems
    .filter((i) => i.category === "BUSINESS_EXPENSE")
    .reduce((sum, i) => sum + i.amount, 0);
  const ytdPersonalExpenses = allItems
    .filter((i) => i.category === "PERSONAL_EXPENSE")
    .reduce((sum, i) => sum + i.amount, 0);
  const ytdOwnerDraws = allItems
    .filter((i) => i.category === "OWNER_DRAW")
    .reduce((sum, i) => sum + i.amount, 0);
  const netProfit = ytdIncome - ytdBusinessExpenses;
  const totalMileage = entries.reduce((sum, e) => sum + e.mileage, 0);
  const mileageDeduction = totalMileage * mileageRate;

  // Group income by description
  const incomeBySource: Record<string, number> = {};
  allItems
    .filter((i) => i.category === "INCOME")
    .forEach((i) => {
      incomeBySource[i.description] = (incomeBySource[i.description] || 0) + i.amount;
    });

  // Group expenses by description
  const expenseByType: Record<string, number> = {};
  allItems
    .filter((i) => i.category === "BUSINESS_EXPENSE")
    .forEach((i) => {
      expenseByType[i.description] = (expenseByType[i.description] || 0) + i.amount;
    });

  // Sort by amount descending
  const sortedIncome = Object.entries(incomeBySource).sort((a, b) => b[1] - a[1]);
  const sortedExpenses = Object.entries(expenseByType).sort((a, b) => b[1] - a[1]);

  // Date range
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );
  const firstDate = sortedEntries[0]
    ? new Date(sortedEntries[0].weekStart).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  const lastDate = sortedEntries[sortedEntries.length - 1]
    ? new Date(sortedEntries[sortedEntries.length - 1].weekEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* Screen-only controls */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-100">Accountant Export</h2>
        <button
          onClick={handlePrint}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save as PDF
        </button>
      </div>

      {/* Printable Document */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm print:bg-white print:border-0 print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-700 print:border-b-2 print:border-slate-300">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white print:text-slate-900">Annual Tax Summary</h1>
              <p className="text-sm text-slate-400 mt-1 print:text-slate-500">Self-Employed Real Estate Professional</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-100 print:text-slate-800">{year} Tax Year</p>
              <p className="text-xs text-slate-500 mt-1 print:text-slate-400">{firstDate} - {lastDate}</p>
              <p className="text-xs text-slate-500 print:text-slate-400">{entries.length} weeks tracked</p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="px-8 py-6 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 print:text-slate-500">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-3">
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-slate-300 print:text-slate-600">Gross Income</span>
              <span className="text-sm font-semibold text-slate-100 print:text-slate-800">{formatCurrency(ytdIncome)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-slate-300 print:text-slate-600">Business Expenses</span>
              <span className="text-sm font-semibold text-red-500">({formatCurrency(ytdBusinessExpenses)})</span>
            </div>
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-slate-300 font-semibold print:text-slate-600">Net Profit (Schedule C)</span>
              <span className={`text-sm font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {formatCurrency(netProfit)}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-slate-300 print:text-slate-600">Owner Draws</span>
              <span className="text-sm font-semibold text-slate-100 print:text-slate-800">{formatCurrency(ytdOwnerDraws)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-slate-300 print:text-slate-600">Personal Expenses</span>
              <span className="text-sm font-semibold text-slate-100 print:text-slate-800">{formatCurrency(ytdPersonalExpenses)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700 pb-2">
              <span className="text-sm text-slate-300 print:text-slate-600">Total Mileage</span>
              <span className="text-sm font-semibold text-slate-100 print:text-slate-800">{totalMileage.toLocaleString()} miles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-300 print:text-slate-600">Mileage Deduction (${mileageRate.toFixed(2)}/mi)</span>
              <span className="text-sm font-semibold text-slate-100 print:text-slate-800">{formatCurrency(mileageDeduction)}</span>
            </div>
          </div>
        </div>

        {/* Income Breakdown */}
        <div className="px-8 py-6 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 print:text-slate-500">Income Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 font-semibold text-slate-300 print:text-slate-600">Source</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">Amount</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedIncome.map(([desc, amount]) => (
                <tr key={desc} className="border-b border-slate-700">
                  <td className="py-2 text-slate-200 print:text-slate-700">{desc}</td>
                  <td className="py-2 text-right text-slate-100 font-medium print:text-slate-800">{formatCurrency(amount)}</td>
                  <td className="py-2 text-right text-slate-400 print:text-slate-500">{((amount / ytdIncome) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 text-slate-100 print:text-slate-800">Total Income</td>
                <td className="py-2 text-right text-emerald-600">{formatCurrency(ytdIncome)}</td>
                <td className="py-2 text-right text-slate-400 print:text-slate-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expense Breakdown */}
        <div className="px-8 py-6 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 print:text-slate-500">Business Expense Breakdown</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 font-semibold text-slate-300 print:text-slate-600">Expense</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">Amount</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map(([desc, amount]) => (
                <tr key={desc} className="border-b border-slate-700">
                  <td className="py-2 text-slate-200 print:text-slate-700">{desc}</td>
                  <td className="py-2 text-right text-slate-100 font-medium print:text-slate-800">{formatCurrency(amount)}</td>
                  <td className="py-2 text-right text-slate-400 print:text-slate-500">
                    {ytdBusinessExpenses > 0 ? ((amount / ytdBusinessExpenses) * 100).toFixed(1) : "0"}%
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 text-slate-100 print:text-slate-800">Total Business Expenses</td>
                <td className="py-2 text-right text-red-500">{formatCurrency(ytdBusinessExpenses)}</td>
                <td className="py-2 text-right text-slate-400 print:text-slate-500">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Weekly Detail */}
        <div className="px-8 py-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4 print:text-slate-500">Weekly Detail</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 font-semibold text-slate-300 print:text-slate-600">Week</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">Income</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">Expenses</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">Net</th>
                <th className="text-right py-2 font-semibold text-slate-300 print:text-slate-600">Miles</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => {
                const income = entry.lineItems
                  .filter((i) => i.category === "INCOME")
                  .reduce((s, i) => s + i.amount, 0);
                const expenses = entry.lineItems
                  .filter((i) => i.category === "BUSINESS_EXPENSE")
                  .reduce((s, i) => s + i.amount, 0);
                const net = income - expenses;
                const start = new Date(entry.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const end = new Date(entry.weekEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                return (
                  <tr key={entry.id} className="border-b border-slate-700">
                    <td className="py-1.5 text-slate-300 print:text-slate-600">{start} - {end}</td>
                    <td className="py-1.5 text-right text-emerald-600">{formatCurrency(income)}</td>
                    <td className="py-1.5 text-right text-red-500">{formatCurrency(expenses)}</td>
                    <td className={`py-1.5 text-right font-medium ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {formatCurrency(net)}
                    </td>
                    <td className="py-1.5 text-right text-slate-400 print:text-slate-500">{entry.mileage > 0 ? entry.mileage.toLocaleString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-900 text-center print:bg-white print:border-t print:border-slate-300">
          <p className="text-xs text-slate-500 print:text-slate-400">
            Generated on {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} | Taxora
          </p>
        </div>
      </div>
    </div>
  );
}
