"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatWeekLabel } from "@/lib/utils";
import {
  SE_TAX_BASE_RATE, SS_RATE, MEDICARE_RATE, SS_WAGE_BASE,
  STANDARD_DEDUCTION, QBI_DEDUCTION_RATE, FEDERAL_BRACKETS,
  STATE_TAX_RATE, MUNICIPAL_TAX_RATE,
} from "@/lib/tax-constants";
import IncomeExpenseChart from "./IncomeExpenseChart";
import PortfolioDashboard from "./PortfolioDashboard";
import { MaskedValue } from "./PrivacyProvider";
import TaxAdvisor from "./TaxAdvisor";
import UpgradePrompt from "./UpgradePrompt";
import ExpiredBanner from "./ExpiredBanner";
import { useSubscription } from "./SubscriptionProvider";

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

interface UserAccount {
  id: string;
  name: string;
  category: string;
  group: string | null;
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
  frequency: string;
  scheduledDay: number;
  isActive: boolean;
}

interface RecurringItem {
  id: string;
  amount: number;
  category: string;
  frequency: string;
  isActive: boolean;
  createdAt: string;
}

interface Settings {
  incomeGoal: number;
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
  investmentGrowthRate: number;
}

export default function DashboardContent() {
  const { isProUser } = useSubscription();
  const [entries, setEntries] = useState<WeeklyEntry[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [portfolioTotal, setPortfolioTotal] = useState<number>(0);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/entries?yearOnly=true").then((r) => r.ok ? r.json() : []),
      fetch("/api/reminders").then((r) => r.ok ? r.json() : []),
      fetch("/api/recurring").then((r) => r.ok ? r.json() : []),
      fetch("/api/settings").then((r) => r.ok ? r.json() : null),
      fetch("/api/accounts").then((r) => r.ok ? r.json() : []),
    ]).then(([entriesData, remindersData, recurringData, settingsData, accountsData]) => {
      setEntries(entriesData);
      setReminders(remindersData.filter((r: Reminder) => r.isActive));
      setRecurringItems(recurringData);
      setSettings(settingsData);
      setUserAccounts(accountsData);
      setLoading(false);
    }).catch(() => setLoading(false));
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

  // Net worth calculations using user settings
  const s = settings;
  const hasSettings = s && (s.bankBalance > 0 || s.homeValue > 0);

  const ytdOwnerDraws = allLineItems
    .filter((i) => i.category === "OWNER_DRAW")
    .reduce((sum, i) => sum + i.amount, 0);

  // Calculate recurring items impact on bank balance
  const refDate = s ? new Date(s.refDate) : new Date();
  const now = new Date();
  let recurringImpact = 0;
  for (const item of recurringItems) {
    if (!item.isActive || item.category === "INVESTMENT") continue;
    const created = new Date(item.createdAt);
    const start = created > refDate ? created : refDate;
    let occurrences = 0;
    if (item.frequency === "WEEKLY") {
      occurrences = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    } else {
      occurrences = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    }
    if (occurrences < 0) occurrences = 0;
    const sign = item.category === "INCOME" ? 1 : -1;
    recurringImpact += sign * item.amount * occurrences;
  }

  const bankBalanceStart = s?.bankBalance ?? 0;
  const bankBalance = bankBalanceStart + ytdIncome - ytdPersonalExpenses - ytdOwnerDraws - ytdBusinessExpenses + recurringImpact;
  const livePortfolio = portfolioTotal > 0 ? portfolioTotal : totalInvestments;

  let homeEquity = 0;
  let studentBal = 0;
  let carBal = 0;

  if (hasSettings) {
    const monthsElapsed = (now.getFullYear() - refDate.getFullYear()) * 12 + (now.getMonth() - refDate.getMonth());

    // Home equity
    if (s.homeValue > 0) {
      const homeValue = s.homeValue * Math.pow(1 + (s.homeAppreciation || 0) / 12, monthsElapsed);
      let mortBal = s.mortgageBalance;
      for (let i = 0; i < monthsElapsed; i++) {
        if (mortBal <= 0) break;
        mortBal -= Math.min((s.mortgagePayment || 0) - mortBal * ((s.mortgageRate || 0) / 12), mortBal);
      }
      homeEquity = homeValue - Math.max(mortBal, 0);
    }

    // Student loans
    if (s.studentLoanBalance > 0) {
      studentBal = s.studentLoanBalance;
      for (let i = 0; i < monthsElapsed; i++) {
        if (studentBal <= 0) break;
        studentBal -= Math.min((s.studentLoanPayment || 0) - studentBal * ((s.studentLoanRate || 0) / 12), studentBal);
      }
      studentBal = Math.max(studentBal, 0);
    }

    // Car loan
    if (s.carLoanBalance > 0) {
      carBal = s.carLoanBalance;
      for (let i = 0; i < monthsElapsed; i++) {
        if (carBal <= 0) break;
        carBal -= Math.min((s.carLoanPayment || 0) - carBal * ((s.carLoanRate || 0) / 12), carBal);
      }
      carBal = Math.max(carBal, 0);
    }
  }

  // Only count cash accounts — investment/crypto/retirement accounts are in livePortfolio
  const cashAccountNames = new Set(userAccounts.filter((a) => a.category === "CASH").map((a) => a.name));
  const totalBankAccounts = latestBalances
    .filter((b) => cashAccountNames.size === 0 || cashAccountNames.has(b.accountName))
    .reduce((sum, b) => sum + b.balance, 0);
  const estNetWorth = homeEquity + totalBankAccounts + livePortfolio - studentBal - carBal;

  // ── Estimated tax liability for self-employed ──
  function estimateTax(netSEIncome: number): number {
    if (netSEIncome <= 0) return 0;

    const seBase = netSEIncome * SE_TAX_BASE_RATE;
    const ssTax = Math.min(seBase, SS_WAGE_BASE) * SS_RATE;
    const medicareTax = seBase * MEDICARE_RATE;
    const seTax = ssTax + medicareTax;

    const agi = netSEIncome - seTax / 2;
    const qbiDeduction = netSEIncome * QBI_DEDUCTION_RATE;
    const taxableIncome = Math.max(agi - STANDARD_DEDUCTION - qbiDeduction, 0);

    let fedTax = 0;
    let remaining = taxableIncome;
    let prevLimit = 0;
    for (const b of FEDERAL_BRACKETS) {
      const span = b.limit - prevLimit;
      const taxable = Math.min(remaining, span);
      fedTax += taxable * b.rate;
      remaining -= taxable;
      prevLimit = b.limit;
      if (remaining <= 0) break;
    }

    const stateTax = taxableIncome * STATE_TAX_RATE;
    const municipalTax = netSEIncome * MUNICIPAL_TAX_RATE;

    return seTax + fedTax + stateTax + municipalTax;
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

      <ExpiredBanner />

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">Reminders</h3>
          <ul className="space-y-1">
            {reminders.map((r) => (
              <li key={r.id} className="text-sm text-amber-700 flex items-center gap-2">
                <span>&#8226;</span> {r.message}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  r.frequency === "MONTHLY" ? "bg-blue-100 text-blue-600" : "bg-amber-200 text-amber-700"
                }`}>
                  {r.frequency === "MONTHLY" ? "Monthly" : "Weekly"}
                </span>
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
      {isProUser ? <TaxAdvisor /> : <div className="mb-8"><UpgradePrompt feature="AI Tax Advisor" /></div>}

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
        {isProUser ? (
          <PortfolioDashboard onTotalChange={setPortfolioTotal} investmentGrowthRate={settings?.investmentGrowthRate} />
        ) : (
          <UpgradePrompt feature="Investment Tracker" />
        )}
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
          {(() => {
            // Dynamically group accounts by "Group - Item" pattern
            const groups = new Map<string, AccountBalance[]>();
            const standalone: AccountBalance[] = [];
            for (const b of latestBalances) {
              const dashIdx = b.accountName.indexOf(" - ");
              if (dashIdx > 0) {
                const groupName = b.accountName.substring(0, dashIdx);
                const list = groups.get(groupName) || [];
                list.push(b);
                groups.set(groupName, list);
              } else {
                standalone.push(b);
              }
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {standalone.map((b) => (
                  <div key={b.id} className="flex justify-between items-center bg-slate-50 rounded-lg px-4 py-3">
                    <span className="text-sm text-slate-600">{b.accountName}</span>
                    <MaskedValue value={formatCurrency(b.balance)} className="font-semibold text-slate-800" />
                  </div>
                ))}
                {Array.from(groups.entries()).map(([groupName, items]) => {
                  const groupTotal = items.reduce((sum, b) => sum + b.balance, 0);
                  return (
                    <div key={groupName} className="bg-slate-50 rounded-lg px-4 py-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-700">{groupName}</span>
                        <MaskedValue value={formatCurrency(groupTotal)} className="font-semibold text-slate-800" />
                      </div>
                      {items.map((b) => (
                        <div key={b.id} className="flex justify-between items-center mt-1 ml-2">
                          <span className="text-xs text-slate-500">{b.accountName.replace(`${groupName} - `, "")}</span>
                          <MaskedValue value={formatCurrency(b.balance)} className="text-xs text-slate-600" />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
