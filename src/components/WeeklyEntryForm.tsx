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

interface AccountBalanceInput {
  tempId: string;
  accountName: string;
  balance: string;
}

interface InvestmentInput {
  tempId: string;
  name: string;
  amount: string;
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
  const [accountBalances, setAccountBalances] = useState<AccountBalanceInput[]>([]);
  const [investments, setInvestments] = useState<InvestmentInput[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Load recurring items and reminders
  useEffect(() => {
    Promise.all([
      fetch("/api/recurring").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
    ]).then(([recurringItems, remindersData]) => {
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

        const recurringInvestments = activeItems
          .filter((r: RecurringItem) => r.category === "INVESTMENT")
          .map((r: RecurringItem) => ({
            tempId: tempId(),
            name: r.description,
            amount: r.amount.toString(),
          }));

        if (recurringLineItems.length > 0) {
          setLineItems((prev) => [...prev, ...recurringLineItems]);
        }
        if (recurringInvestments.length > 0) {
          setInvestments((prev) => [...prev, ...recurringInvestments]);
        }
      }
    });
  }, [editId]);

  // Load existing entry when editing
  useEffect(() => {
    if (editId) {
      fetch(`/api/entries/${editId}`)
        .then((r) => r.json())
        .then((entry) => {
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
          setAccountBalances(
            entry.accountBalances.map((b: { accountName: string; balance: number }) => ({
              tempId: tempId(),
              accountName: b.accountName,
              balance: b.balance.toString(),
            }))
          );
          setInvestments(
            entry.investments.map((inv: { name: string; amount: number }) => ({
              tempId: tempId(),
              name: inv.name,
              amount: inv.amount.toString(),
            }))
          );
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

  function addAccountBalance() {
    setAccountBalances([...accountBalances, { tempId: tempId(), accountName: "", balance: "" }]);
  }

  function removeAccountBalance(id: string) {
    setAccountBalances(accountBalances.filter((b) => b.tempId !== id));
  }

  function updateAccountBalance(id: string, field: "accountName" | "balance", value: string) {
    setAccountBalances(accountBalances.map((b) => (b.tempId === id ? { ...b, [field]: value } : b)));
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
      accountBalances: accountBalances
        .filter((b) => b.accountName && b.balance)
        .map((b) => ({
          accountName: b.accountName,
          balance: parseFloat(b.balance),
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
        {accountBalances.map((b) => (
          <div key={b.tempId} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Account Name"
              value={b.accountName}
              onChange={(e) => updateAccountBalance(b.tempId, "accountName", e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Balance"
              step="0.01"
              value={b.balance}
              onChange={(e) => updateAccountBalance(b.tempId, "balance", e.target.value)}
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeAccountBalance(b.tempId)}
              className="text-red-400 hover:text-red-600 px-2"
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addAccountBalance}
          className="text-sm text-slate-500 hover:text-slate-700 mt-1"
        >
          + Add Account
        </button>
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
        {investments.map((inv) => (
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
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
