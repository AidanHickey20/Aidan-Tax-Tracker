"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentWeekRange, formatCurrency, type Category } from "@/lib/utils";
import { format } from "date-fns";

interface LineItemInput {
  tempId: string;
  description: string;
  amount: string;
  category: Category;
}

interface UserAccount {
  id: string;
  name: string;
  category: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface InvestmentInput {
  tempId: string;
  name: string;
  amount: string;
  isRecurring?: boolean;
}

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  frequency: string;
  scheduledDay: number;
  isActive: boolean;
}

interface Reminder {
  id: string;
  message: string;
  frequency: string;
  scheduledDay: number;
  isActive: boolean;
}

let nextTempId = 0;
function tempId() {
  return `temp-${nextTempId++}`;
}

export default function WeeklyEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const { start, end } = getCurrentWeekRange();
  const [weekStart, setWeekStart] = useState(format(start, "yyyy-MM-dd"));
  const [weekEnd, setWeekEnd] = useState(format(end, "yyyy-MM-dd"));
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [lineItems, setLineItems] = useState<LineItemInput[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [investments, setInvestments] = useState<InvestmentInput[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);

  // Load recurring items, reminders, portfolio investments, and user accounts
  useEffect(() => {
    Promise.all([
      fetch("/api/recurring").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ]).then(([recurringItems, remindersData, portfolioItems, accounts]) => {
      setUserAccounts(accounts.filter((a: UserAccount) => a.isActive));
      setReminders(remindersData.filter((r: Reminder) => r.isActive));

      if (!editId) {
        // Pre-fill from recurring items, filtering by frequency
        const weekStartDate = new Date(start);
        const weekEndDate = new Date(end);

        const activeItems = recurringItems.filter((r: RecurringItem) => {
          if (!r.isActive) return false;
          if (r.frequency === "WEEKLY") return true;
          // Monthly: include if scheduled day falls within this week
          if (r.frequency === "MONTHLY") {
            const day = r.scheduledDay;
            if (day < 1) {
              // No specific day set — include in the first week of the month
              return weekStartDate.getDate() <= 7;
            }
            // Check if scheduled day falls within the week range
            const month = weekStartDate.getMonth();
            const year = weekStartDate.getFullYear();
            const scheduled = new Date(year, month, day);
            // Handle months shorter than scheduledDay (e.g. Feb 31 → last day)
            if (scheduled.getMonth() !== month) {
              // Day doesn't exist this month, use last day
              const lastDay = new Date(year, month + 1, 0);
              return lastDay >= weekStartDate && lastDay <= weekEndDate;
            }
            return scheduled >= weekStartDate && scheduled <= weekEndDate;
          }
          return true;
        });

        const recurringLineItems = activeItems
          .filter((r: RecurringItem) => r.category !== "INVESTMENT")
          .map((r: RecurringItem) => ({
            tempId: tempId(),
            description: r.description,
            amount: r.amount.toString(),
            category: r.category as Category,
          }));

        // Preload investments from portfolio auto-invest amounts
        const portfolioInvestments = portfolioItems
          .filter((inv: { recurringAmount: number }) => inv.recurringAmount > 0)
          .map((inv: { name: string; recurringAmount: number }) => ({
            tempId: tempId(),
            name: inv.name,
            amount: inv.recurringAmount.toString(),
            isRecurring: true,
          }));

        if (recurringLineItems.length > 0) {
          setLineItems((prev) => [...prev, ...recurringLineItems]);
        }
        if (portfolioInvestments.length > 0) {
          setInvestments((prev) => [...prev, ...portfolioInvestments]);
        }
      }
    });
  }, [editId]);

  // Load existing entry when editing (also fetch portfolio for investment labels)
  useEffect(() => {
    if (editId) {
      Promise.all([
        fetch(`/api/entries/${editId}`).then((r) => r.json()),
        fetch("/api/portfolio").then((r) => r.json()),
      ]).then(([entry, portfolioItems]) => {
          setWeekStart(format(new Date(entry.weekStart), "yyyy-MM-dd"));
          setWeekEnd(format(new Date(entry.weekEnd), "yyyy-MM-dd"));
          setMileage(entry.mileage.toString());
          setNotes(entry.notes);
          setLineItems(
            entry.lineItems.map((i: { description: string; amount: number; category: string }) => ({
              tempId: tempId(),
              description: i.description,
              amount: i.amount.toString(),
              category: i.category as Category,
            }))
          );
          const balanceMap: Record<string, string> = {};
          entry.accountBalances.forEach((b: { accountName: string; balance: number }) => {
            balanceMap[b.accountName] = b.balance.toString();
          });
          setBalances(balanceMap);

          // Build investment list from portfolio auto-invest items + saved entry data
          const autoInvestItems = portfolioItems
            .filter((inv: { recurringAmount: number }) => inv.recurringAmount > 0);

          const savedInvMap = new Map<string, number>();
          entry.investments.forEach((inv: { name: string; amount: number }) => {
            savedInvMap.set(inv.name, inv.amount);
          });

          const portfolioInvs: InvestmentInput[] = autoInvestItems.map(
            (inv: { name: string; recurringAmount: number }) => ({
              tempId: tempId(),
              name: inv.name,
              amount: savedInvMap.has(inv.name)
                ? savedInvMap.get(inv.name)!.toString()
                : inv.recurringAmount.toString(),
              isRecurring: true,
            })
          );

          const portfolioNames = autoInvestItems.map((inv: { name: string }) => inv.name);
          const extraInvs: InvestmentInput[] = entry.investments
            .filter((inv: { name: string; amount: number }) => !portfolioNames.includes(inv.name))
            .map((inv: { name: string; amount: number }) => ({
              tempId: tempId(),
              name: inv.name,
              amount: inv.amount.toString(),
            }));

          setInvestments([...portfolioInvs, ...extraInvs]);
        });
    }
  }, [editId]);

  function addLineItem(category: Category) {
    setLineItems([...lineItems, { tempId: tempId(), description: "", amount: "", category }]);
  }

  function removeLineItem(id: string) {
    setLineItems(lineItems.filter((i) => i.tempId !== id));
  }

  function updateLineItem(id: string, field: "description" | "amount", value: string) {
    setLineItems(lineItems.map((i) => (i.tempId === id ? { ...i, [field]: value } : i)));
  }

  function updateBalance(key: string, value: string) {
    setBalances((prev) => ({ ...prev, [key]: value }));
  }

  function addInvestment() {
    setInvestments([...investments, { tempId: tempId(), name: "", amount: "" }]);
  }

  function removeInvestment(id: string) {
    setInvestments(investments.filter((inv) => inv.tempId !== id));
  }

  function updateInvestment(id: string, field: "name" | "amount", value: string) {
    setInvestments(investments.map((inv) => (inv.tempId === id ? { ...inv, [field]: value } : inv)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      weekStart,
      weekEnd,
      mileage: parseFloat(mileage) || 0,
      notes,
      lineItems: lineItems
        .filter((i) => i.description && i.amount)
        .map((i) => ({
          description: i.description,
          amount: parseFloat(i.amount),
          category: i.category,
        })),
      accountBalances: userAccounts
        .map((a) => a.name)
        .filter((key) => balances[key] && parseFloat(balances[key]) !== 0)
        .map((key) => ({
          accountName: key,
          balance: parseFloat(balances[key]),
        })),
      investments: investments
        .filter((inv) => inv.name && inv.amount)
        .map((inv) => ({
          name: inv.name,
          amount: parseFloat(inv.amount),
        })),
    };

    const url = editId ? `/api/entries/${editId}` : "/api/entries";
    const method = editId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      router.push("/");
    }, 1000);
  }

  const categoryGroups: { category: Category; label: string; color: string }[] = [
    { category: "INCOME", label: "Income", color: "border-emerald-300 bg-emerald-50" },
    { category: "BUSINESS_EXPENSE", label: "Business Expenses", color: "border-red-300 bg-red-50" },
    { category: "PERSONAL_EXPENSE", label: "Personal Expenses", color: "border-orange-300 bg-orange-50" },
    { category: "OWNER_DRAW", label: "Owner Draws / Transfers", color: "border-blue-300 bg-blue-50" },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        {editId ? "Edit Weekly Entry" : "New Weekly Entry"}
      </h2>

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 text-sm mb-2">Don&apos;t forget:</h3>
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

      {/* Week Date Range */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">Week Period</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">Start Date</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-500 mb-1">End Date</label>
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* Line Item Groups */}
      {categoryGroups.map(({ category, label, color }) => {
        const items = lineItems.filter((i) => i.category === category);
        const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        return (
          <div key={category} className={`border rounded-lg p-4 mb-4 shadow-sm ${color}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700">{label}</h3>
              {total > 0 && (
                <span className="text-sm font-medium text-slate-600">
                  Total: {formatCurrency(total)}
                </span>
              )}
            </div>
            {items.map((item) => (
              <div key={item.tempId} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(item.tempId, "description", e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) => updateLineItem(item.tempId, "amount", e.target.value)}
                  className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeLineItem(item.tempId)}
                  className="text-red-400 hover:text-red-600 px-2"
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addLineItem(category)}
              className="text-sm text-slate-500 hover:text-slate-700 mt-1"
            >
              + Add {label.replace(/s$/, "")}
            </button>
          </div>
        );
      })}

      {/* Account Balances */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">Account Balances</h3>

        {/* Standalone accounts (no group) */}
        {userAccounts.filter((a) => !a.group).map((account) => (
          <div key={account.id} className="flex items-center gap-2 mb-2">
            <label className="flex-1 text-sm text-slate-600">{account.name}</label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={balances[account.name] || ""}
              onChange={(e) => updateBalance(account.name, e.target.value)}
              className="w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm text-right"
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
            <div key={groupName} className="mt-4 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">{groupName}</span>
                <span className="text-sm font-medium text-slate-500">
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
                    <label className="flex-1 text-sm text-slate-500">{displayLabel}</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={balances[account.name] || ""}
                      onChange={(e) => updateBalance(account.name, e.target.value)}
                      className="w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm text-right"
                    />
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Investments */}
      <div className="bg-white border border-indigo-200 rounded-lg p-4 mb-4 shadow-sm bg-indigo-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-700">Investments</h3>
          {investments.length > 0 && (
            <span className="text-sm font-medium text-slate-600">
              Total: {formatCurrency(investments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0))}
            </span>
          )}
        </div>
        {/* Recurring investments - fixed labels, editable amounts */}
        {investments.filter((inv) => inv.isRecurring).map((inv) => (
          <div key={inv.tempId} className="flex items-center gap-2 mb-2">
            <label className="flex-1 text-sm text-slate-600">{inv.name}</label>
            <input
              type="number"
              placeholder="0.00"
              step="0.01"
              value={inv.amount}
              onChange={(e) => updateInvestment(inv.tempId, "amount", e.target.value)}
              className="w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-right"
            />
          </div>
        ))}
        {/* Extra one-off investments */}
        {investments.filter((inv) => !inv.isRecurring).map((inv) => (
          <div key={inv.tempId} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Investment Name"
              value={inv.name}
              onChange={(e) => updateInvestment(inv.tempId, "name", e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            />
            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              value={inv.amount}
              onChange={(e) => updateInvestment(inv.tempId, "amount", e.target.value)}
              className="w-40 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-right"
            />
            <button
              type="button"
              onClick={() => removeInvestment(inv.tempId)}
              className="text-red-400 hover:text-red-600 px-2"
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addInvestment}
          className="text-sm text-slate-500 hover:text-slate-700 mt-1"
        >
          + Add Investment
        </button>
      </div>

      {/* Mileage */}
      <div className="bg-white border border-purple-200 rounded-lg p-4 mb-4 shadow-sm bg-purple-50">
        <h3 className="font-semibold text-slate-700 mb-3">Mileage</h3>
        <input
          type="number"
          placeholder="Miles driven this week"
          step="0.1"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        />
      </div>

      {/* Notes */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">Notes</h3>
        <textarea
          placeholder="Any notes for this week..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || saved}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
          saved
            ? "bg-emerald-500"
            : saving
            ? "bg-slate-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {saved ? "Saved! Redirecting..." : saving ? "Saving..." : editId ? "Update Entry" : "Save Weekly Entry"}
      </button>
    </form>
  );
}
