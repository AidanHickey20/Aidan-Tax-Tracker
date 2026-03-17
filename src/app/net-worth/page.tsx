"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { CRYPTO_TICKERS, DEFAULT_INVESTMENT_GROWTH_RATE } from "@/lib/constants";
import Link from "next/link";
import { MaskedValue } from "@/components/PrivacyProvider";
import { useSubscription } from "@/components/SubscriptionProvider";

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
  studentLoanPaymentDay: number;
  carLoanBalance: number;
  carLoanRate: number;
  carLoanPayment: number;
  carLoanPaymentDay: number;
  refDate: string;
  investmentGrowthRate: number;
}

interface NetWorthItem {
  id: string;
  name: string;
  value: number;
  type: "ASSET" | "LIABILITY";
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

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

function monthsToPayoff(balance: number, monthlyPayment: number): number {
  if (monthlyPayment <= 0) return Infinity;
  return Math.ceil(balance / monthlyPayment);
}

function paymentsSinceRef(refDate: Date, now: Date, paymentDay: number): number {
  let count = 0;
  let current = new Date(refDate.getFullYear(), refDate.getMonth(), paymentDay);
  if (current < refDate) {
    current.setMonth(current.getMonth() + 1);
  }
  while (current <= now) {
    count++;
    current.setMonth(current.getMonth() + 1);
  }
  return count;
}

function ProgressBar({ pctPaid, color }: { pctPaid: number; color: string }) {
  const clamped = Math.min(Math.max(pctPaid, 0), 100);
  return (
    <div className="w-full bg-slate-800 rounded-full h-4 mt-2 overflow-hidden">
      <div
        className={`h-4 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface AccountBalance {
  accountName: string;
  balance: number;
}

interface WeeklyEntry {
  weekStart: string;
  accountBalances: AccountBalance[];
}

interface UserAccount {
  id: string;
  name: string;
  category: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
}

function AddItemForm({ type, onAdd }: { type: "ASSET" | "LIABILITY"; onAdd: (name: string, value: number) => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !value) return;
    onAdd(name.trim(), parseFloat(value) || 0);
    setName("");
    setValue("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-emerald-400 hover:text-emerald-300 px-6 py-3"
      >
        + Add {type === "ASSET" ? "Asset" : "Liability"}
      </button>
    );
  }

  return (
    <div className="px-6 py-3 flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs text-slate-400 mb-1">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "ASSET" ? "e.g. Savings Account" : "e.g. Credit Card"}
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-48"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Value ($)</label>
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-32"
        />
      </div>
      <button
        onClick={handleSubmit}
        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700"
      >
        Add
      </button>
      <button
        onClick={() => { setOpen(false); setName(""); setValue(""); }}
        className="text-slate-500 hover:text-slate-300 text-sm px-2 py-2"
      >
        Cancel
      </button>
    </div>
  );
}

export default function NetWorthPage() {
  const { canEdit } = useSubscription();
  const [investments, setInvestments] = useState<TrackedInvestment[]>([]);
  const [investmentValues, setInvestmentValues] = useState<Record<string, number>>({});
  const [latestBalances, setLatestBalances] = useState<AccountBalance[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [customItems, setCustomItems] = useState<NetWorthItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [savingBalances, setSavingBalances] = useState(false);
  const [balancesSaved, setBalancesSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    let invs: TrackedInvestment[] = [];
    let entries: WeeklyEntry[] = [];
    let s: Settings | null = null;

    let accounts: UserAccount[] = [];
    let nwItems: NetWorthItem[] = [];
    try {
      const [invRes, entriesRes, settingsRes, accountsRes, nwRes] = await Promise.all([
        fetch("/api/portfolio"),
        fetch("/api/entries?yearOnly=true"),
        fetch("/api/settings"),
        fetch("/api/accounts"),
        fetch("/api/net-worth-items"),
      ]);
      if (invRes.ok) invs = await invRes.json();
      if (entriesRes.ok) entries = await entriesRes.json();
      if (settingsRes.ok) s = await settingsRes.json();
      if (accountsRes.ok) accounts = await accountsRes.json();
      if (nwRes.ok) nwItems = await nwRes.json();
    } catch {
      // DB may be unreachable — use defaults
    }

    const activeAccounts = accounts.filter((a: UserAccount) => a.isActive);
    setInvestments(invs);
    setSettings(s);
    setUserAccounts(activeAccounts);
    setCustomItems(nwItems);

    // Get the latest entry's account balances
    const latestEntry = entries[0];
    const latestBals = latestEntry?.accountBalances || [];
    setLatestBalances(latestBals);

    // Populate editable balances from latest entry
    const balMap: Record<string, string> = {};
    for (const b of latestBals) {
      balMap[b.accountName] = b.balance ? b.balance.toString() : "";
    }
    setBalances(balMap);

    const priceableInvs = invs.filter((i) => i.type !== "MANUAL");
    const manualInvs = invs.filter((i) => i.type === "MANUAL");

    const values: Record<string, number> = {};
    for (const m of manualInvs) {
      const startBalance = m.avgCost * m.shares;
      const growthRate = s?.investmentGrowthRate ?? DEFAULT_INVESTMENT_GROWTH_RATE;
      const weeklyRate = Math.pow(1 + growthRate, 1 / 52) - 1;
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

  const addItem = async (name: string, value: number, type: "ASSET" | "LIABILITY") => {
    const res = await fetch("/api/net-worth-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, value, type }),
    });
    if (res.ok) {
      const item = await res.json();
      setCustomItems((prev) => [...prev, item]);
    }
  };

  const deleteItem = async (id: string) => {
    const res = await fetch("/api/net-worth-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setCustomItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const startEdit = (item: NetWorthItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditValue(item.value ? item.value.toString() : "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const item = customItems.find((i) => i.id === editingId);
    if (!item) return;
    const res = await fetch("/api/net-worth-items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editName, value: parseFloat(editValue) || 0, type: item.type }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCustomItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setEditingId(null);
    }
  };

  const updateBalance = (key: string, value: string) => {
    setBalances((prev) => ({ ...prev, [key]: value }));
    setBalancesSaved(false);
  };

  const saveBalances = async () => {
    setSavingBalances(true);
    const payload = userAccounts
      .map((a) => ({
        accountName: a.name,
        balance: parseFloat(balances[a.name] || "0") || 0,
      }))
      .filter((b) => b.balance !== 0);

    const res = await fetch("/api/entries/balances", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ balances: payload }),
    });
    if (res.ok) {
      const updated: AccountBalance[] = await res.json();
      setLatestBalances(updated);
      setBalancesSaved(true);
      setTimeout(() => setBalancesSaved(false), 3000);
    }
    setSavingBalances(false);
  };

  // ── Dynamic calculations based on current date and user settings ──
  const calcs = useMemo(() => {
    if (!settings) {
      return {
        homeValue: 0, mortgageBalance: 0, homeEquity: 0,
        studentLoanBalance: 0, studentPaidOff: 0, studentMonthsLeft: 0, studentPayoffDate: new Date(), studentPaymentsMade: 0,
        studentMonthlyInterest: 0, studentMonthlyPrincipal: 0,
        carLoanBalance: 0, carPaidOff: 0, carMonthsLeft: 0, carPayoffDate: new Date(), carPaymentsMade: 0,
        carMonthlyInterest: 0, carMonthlyPrincipal: 0,
      };
    }

    const now = new Date();
    const refDate = new Date(settings.refDate);
    const months = monthsElapsed(refDate, now);

    const monthlyAppreciation = (settings.homeAppreciation || 0) / 12;
    const homeValue = settings.homeValue > 0
      ? settings.homeValue * Math.pow(1 + monthlyAppreciation, months)
      : 0;

    const mortgageBalance = settings.mortgageBalance > 0
      ? amortize(settings.mortgageBalance, settings.mortgageRate, settings.mortgagePayment, months)
      : 0;
    const homeEquity = homeValue - mortgageBalance;

    const studentPaymentsMade = settings.studentLoanBalance > 0
      ? paymentsSinceRef(refDate, now, settings.studentLoanPaymentDay ?? 1)
      : 0;
    const studentLoanBal = Math.max(0, settings.studentLoanBalance - studentPaymentsMade * settings.studentLoanPayment);
    const studentPaidOff = settings.studentLoanBalance > 0
      ? ((settings.studentLoanBalance - studentLoanBal) / settings.studentLoanBalance) * 100
      : 0;
    const studentMonthsLeft = settings.studentLoanBalance > 0
      ? monthsToPayoff(studentLoanBal, settings.studentLoanPayment)
      : 0;
    const studentPayoffDate = new Date(now.getFullYear(), now.getMonth() + studentMonthsLeft, 1);
    const studentMonthlyInterest = studentLoanBal > 0 ? studentLoanBal * (settings.studentLoanRate / 12) : 0;
    const studentMonthlyPrincipal = studentLoanBal > 0
      ? Math.min(settings.studentLoanPayment - studentMonthlyInterest, studentLoanBal)
      : 0;

    const carPaymentsMade = settings.carLoanBalance > 0
      ? paymentsSinceRef(refDate, now, settings.carLoanPaymentDay ?? 16)
      : 0;
    const carLoanBal = Math.max(0, settings.carLoanBalance - carPaymentsMade * settings.carLoanPayment);
    const carPaidOff = settings.carLoanBalance > 0
      ? ((settings.carLoanBalance - carLoanBal) / settings.carLoanBalance) * 100
      : 0;
    const carMonthsLeft = settings.carLoanBalance > 0
      ? monthsToPayoff(carLoanBal, settings.carLoanPayment)
      : 0;
    const carPayoffDate = new Date(now.getFullYear(), now.getMonth() + carMonthsLeft, 1);
    const carMonthlyInterest = carLoanBal > 0 ? carLoanBal * (settings.carLoanRate / 12) : 0;
    const carMonthlyPrincipal = carLoanBal > 0
      ? Math.min(settings.carLoanPayment - carMonthlyInterest, carLoanBal)
      : 0;

    return {
      homeValue, mortgageBalance, homeEquity,
      studentLoanBalance: studentLoanBal, studentPaidOff, studentMonthsLeft, studentPayoffDate, studentPaymentsMade,
      studentMonthlyInterest, studentMonthlyPrincipal,
      carLoanBalance: carLoanBal, carPaidOff, carMonthsLeft, carPayoffDate, carPaymentsMade,
      carMonthlyInterest, carMonthlyPrincipal,
    };
  }, [settings]);

  if (loading) {
    return <div className="text-slate-400 py-8">Loading net worth...</div>;
  }

  const totalBankAccounts = userAccounts.reduce(
    (sum, a) => sum + (parseFloat(balances[a.name] || "0") || 0), 0
  );
  const totalInvestments = Object.values(investmentValues).reduce((s, v) => s + v, 0);
  const customAssets = customItems.filter((i) => i.type === "ASSET");
  const customLiabilities = customItems.filter((i) => i.type === "LIABILITY");
  const totalCustomAssets = customAssets.reduce((s, i) => s + i.value, 0);
  const totalCustomLiabilities = customLiabilities.reduce((s, i) => s + i.value, 0);
  const totalAssets = calcs.homeEquity + totalBankAccounts + totalInvestments + totalCustomAssets;
  const totalLiabilities = calcs.studentLoanBalance + calcs.carLoanBalance + totalCustomLiabilities;
  const netWorth = totalAssets - totalLiabilities;

  function formatDate(d: Date) {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  const hasHome = (settings?.homeValue ?? 0) > 0;
  const hasStudentLoan = (settings?.studentLoanBalance ?? 0) > 0;
  const hasCarLoan = (settings?.carLoanBalance ?? 0) > 0;
  const hasAnySetup = hasHome || hasStudentLoan || hasCarLoan || userAccounts.length > 0 || customItems.length > 0;

  const renderCustomItem = (item: NetWorthItem) => {
    if (editingId === item.id) {
      return (
        <div key={item.id} className="px-6 py-3 flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 w-48"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Value ($)</label>
            <input
              type="number"
              step="0.01"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 w-32"
            />
          </div>
          <button onClick={saveEdit} className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-emerald-700">
            Save
          </button>
          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 text-sm px-2 py-2">
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div key={item.id} className="px-6 py-4 flex justify-between items-center">
        <span className="text-sm font-medium text-slate-200">{item.name}</span>
        <div className="flex items-center gap-3">
          <MaskedValue
            value={formatCurrency(item.value)}
            className={`font-semibold ${item.type === "ASSET" ? "text-slate-100" : "text-red-500"}`}
          />
          {canEdit && (
            <div className="flex gap-1">
              <button onClick={() => startEdit(item)} className="text-slate-500 hover:text-slate-300 text-xs">
                Edit
              </button>
              <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300 text-xs">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-slate-500 hover:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-100">Estimated Net Worth</h2>
      </div>

      {!hasAnySetup && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6 mb-8 text-center">
          <p className="text-blue-400 font-medium mb-2">Set up your financial profile</p>
          <p className="text-sm text-blue-400 mb-4">
            Head to Settings to enter your starting bank balance, home value, loans, and more.
          </p>
          <Link href="/settings" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Go to Settings
          </Link>
        </div>
      )}

      {/* Net Worth Hero */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm mb-8 text-center">
        <p className="text-sm text-slate-400 uppercase tracking-wide mb-1">Net Worth</p>
        <MaskedValue value={formatCurrency(netWorth)} className={`text-4xl font-bold ${netWorth >= 0 ? "text-emerald-600" : "text-red-500"} block`} />
        <div className="flex justify-center gap-8 mt-4 text-sm">
          <div>
            <span className="text-slate-400">Total Assets: </span>
            <MaskedValue value={formatCurrency(totalAssets)} className="font-semibold text-emerald-600" />
          </div>
          <div>
            <span className="text-slate-400">Total Liabilities: </span>
            <MaskedValue value={formatCurrency(totalLiabilities)} className="font-semibold text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Assets ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="font-semibold text-slate-200">Assets</h3>
            <MaskedValue value={formatCurrency(totalAssets)} className="text-2xl font-bold text-emerald-600 mt-1 block" />
          </div>
          <div className="divide-y divide-slate-700">
            {/* Home */}
            {hasHome && (
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-200">Primary Residence (Equity)</span>
                  <MaskedValue value={formatCurrency(calcs.homeEquity)} className="font-semibold text-slate-100" />
                </div>
                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
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

            {/* Account Balances */}
            {userAccounts.length > 0 && (
              <div className="px-6 py-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-200">Account Balances</span>
                  <MaskedValue value={formatCurrency(totalBankAccounts)} className="font-semibold text-slate-100" />
                </div>

                {/* Standalone accounts */}
                {userAccounts.filter((a) => !a.group).map((account) => (
                  <div key={account.id} className="flex items-center gap-2 mb-2">
                    <label className="flex-1 text-sm text-slate-300">{account.name}</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={balances[account.name] || ""}
                      onChange={(e) => updateBalance(account.name, e.target.value)}
                      className="w-40 border border-slate-600 rounded-lg px-3 py-2 text-sm text-right bg-slate-900 text-slate-100 placeholder-slate-500"
                    />
                  </div>
                ))}

                {/* Grouped accounts */}
                {(() => {
                  const groups = new Map<string, UserAccount[]>();
                  userAccounts.filter((a) => a.group).forEach((a) => {
                    const list = groups.get(a.group!) || [];
                    list.push(a);
                    groups.set(a.group!, list);
                  });
                  return Array.from(groups.entries()).map(([groupName, accounts]) => (
                    <div key={groupName} className="mt-3 border-t border-slate-700 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-slate-200">{groupName}</span>
                        <span className="text-sm font-medium text-slate-400">
                          Total: {formatCurrency(
                            accounts.reduce((sum, a) => sum + (parseFloat(balances[a.name] || "0") || 0), 0)
                          )}
                        </span>
                      </div>
                      {accounts.map((account) => {
                        const displayLabel = account.group
                          ? account.name.replace(`${account.group} - `, "")
                          : account.name;
                        return (
                          <div key={account.id} className="flex items-center gap-2 mb-2 ml-4">
                            <label className="flex-1 text-sm text-slate-400">{displayLabel}</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              value={balances[account.name] || ""}
                              onChange={(e) => updateBalance(account.name, e.target.value)}
                              className="w-40 border border-slate-600 rounded-lg px-3 py-2 text-sm text-right bg-slate-900 text-slate-100 placeholder-slate-500"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}

                {/* Save button */}
                {canEdit && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={saveBalances}
                      disabled={savingBalances}
                      className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {savingBalances ? "Saving..." : "Save Balances"}
                    </button>
                    {balancesSaved && (
                      <span className="text-xs text-emerald-400">Saved!</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Investments */}
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-200">Investment Portfolio</span>
                <MaskedValue value={formatCurrency(totalInvestments)} className="font-semibold text-slate-100" />
              </div>
              <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-700">
                {investments.map((inv) => (
                  <div key={inv.id} className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">
                      {inv.name}
                      {inv.type === "CRYPTO" && (
                        <span className="text-slate-500 ml-1">({CRYPTO_TICKERS[inv.symbol] || inv.symbol.toUpperCase()})</span>
                      )}
                      {inv.type === "STOCK" && (
                        <span className="text-slate-500 ml-1">({inv.symbol})</span>
                      )}
                    </span>
                    <MaskedValue value={formatCurrency(investmentValues[inv.id] ?? 0)} className="text-slate-300 font-medium" />
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Assets */}
            {customAssets.map(renderCustomItem)}

            {/* Add Asset */}
            {canEdit && (
              <AddItemForm type="ASSET" onAdd={(name, value) => addItem(name, value, "ASSET")} />
            )}
          </div>
        </div>

        {/* ── Liabilities ── */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="font-semibold text-slate-200">Liabilities</h3>
            <MaskedValue value={formatCurrency(totalLiabilities)} className="text-2xl font-bold text-red-500 mt-1 block" />
          </div>
          <div className="divide-y divide-slate-700">
            {/* Student Loans */}
            {hasStudentLoan && (
              <div className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-200">Student Loans</span>
                  <MaskedValue value={formatCurrency(calcs.studentLoanBalance)} className="font-semibold text-red-500" />
                </div>
                <ProgressBar pctPaid={calcs.studentPaidOff} color="bg-emerald-500" />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{calcs.studentPaidOff.toFixed(1)}% paid off</span>
                  <span>
                    <MaskedValue value={`${formatCurrency(settings!.studentLoanBalance - calcs.studentLoanBalance)} of ${formatCurrency(settings!.studentLoanBalance)}`} />
                  </span>
                </div>

                {/* Payment Breakdown */}
                {settings!.studentLoanRate > 0 && settings!.studentLoanPayment > 0 && calcs.studentLoanBalance > 0 && (
                  <div className="mt-3 bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide mb-2">Monthly Payment Breakdown</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-700">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${settings!.studentLoanPayment > 0 ? (calcs.studentMonthlyPrincipal / settings!.studentLoanPayment) * 100 : 0}%` }}
                          />
                          <div
                            className="h-full bg-red-400 transition-all"
                            style={{ width: `${settings!.studentLoanPayment > 0 ? (calcs.studentMonthlyInterest / settings!.studentLoanPayment) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-300">
                          Principal: <MaskedValue value={formatCurrency(calcs.studentMonthlyPrincipal)} className="font-semibold text-emerald-400 inline" />
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <span className="text-slate-300">
                          Interest: <MaskedValue value={formatCurrency(calcs.studentMonthlyInterest)} className="font-semibold text-red-400 inline" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Monthly Payment ({settings!.studentLoanPaymentDay ?? 1}{ordinalSuffix(settings!.studentLoanPaymentDay ?? 1)} of month)</span>
                    <MaskedValue value={`${formatCurrency(settings!.studentLoanPayment)}/mo`} />
                  </div>
                  <div className="flex justify-between">
                    <span>Payments Made</span>
                    <span>{calcs.studentPaymentsMade}</span>
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
                  <span className="text-sm font-medium text-slate-200">Car Loan</span>
                  <MaskedValue value={formatCurrency(calcs.carLoanBalance)} className="font-semibold text-red-500" />
                </div>
                <ProgressBar pctPaid={calcs.carPaidOff} color="bg-emerald-500" />
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>{calcs.carPaidOff.toFixed(1)}% paid off</span>
                  <span>
                    <MaskedValue value={`${formatCurrency(settings!.carLoanBalance - calcs.carLoanBalance)} of ${formatCurrency(settings!.carLoanBalance)}`} />
                  </span>
                </div>

                {/* Payment Breakdown */}
                {settings!.carLoanRate > 0 && settings!.carLoanPayment > 0 && calcs.carLoanBalance > 0 && (
                  <div className="mt-3 bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide mb-2">Monthly Payment Breakdown</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-700">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${settings!.carLoanPayment > 0 ? (calcs.carMonthlyPrincipal / settings!.carLoanPayment) * 100 : 0}%` }}
                          />
                          <div
                            className="h-full bg-red-400 transition-all"
                            style={{ width: `${settings!.carLoanPayment > 0 ? (calcs.carMonthlyInterest / settings!.carLoanPayment) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-300">
                          Principal: <MaskedValue value={formatCurrency(calcs.carMonthlyPrincipal)} className="font-semibold text-emerald-400 inline" />
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <span className="text-slate-300">
                          Interest: <MaskedValue value={formatCurrency(calcs.carMonthlyInterest)} className="font-semibold text-red-400 inline" />
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Monthly Payment ({settings!.carLoanPaymentDay ?? 16}{ordinalSuffix(settings!.carLoanPaymentDay ?? 16)} of month)</span>
                    <MaskedValue value={`${formatCurrency(settings!.carLoanPayment)}/mo`} />
                  </div>
                  <div className="flex justify-between">
                    <span>Payments Made</span>
                    <span>{calcs.carPaymentsMade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Payoff</span>
                    <span>{formatDate(calcs.carPayoffDate)} ({calcs.carMonthsLeft} months)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Liabilities */}
            {customLiabilities.map(renderCustomItem)}

            {/* Add Liability */}
            {canEdit && (
              <AddItemForm type="LIABILITY" onAdd={(name, value) => addItem(name, value, "LIABILITY")} />
            )}

            {!hasStudentLoan && !hasCarLoan && customLiabilities.length === 0 && (
              <div className="px-6 py-4 text-sm text-slate-500 text-center">
                No liabilities configured. Add them above or in Settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
