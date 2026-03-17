"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type Category, formatCurrency } from "@/lib/utils";
import { useSubscription } from "./SubscriptionProvider";
import ExpiredBanner from "./ExpiredBanner";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatSchedule(frequency: string, scheduledDay: number): string {
  if (frequency === "MONTHLY") {
    if (scheduledDay > 0) {
      const suffix =
        scheduledDay === 1 || scheduledDay === 21 || scheduledDay === 31
          ? "st"
          : scheduledDay === 2 || scheduledDay === 22
          ? "nd"
          : scheduledDay === 3 || scheduledDay === 23
          ? "rd"
          : "th";
      return `Monthly (${scheduledDay}${suffix})`;
    }
    return "Monthly";
  }
  if (scheduledDay >= 0 && scheduledDay <= 6) {
    return `Weekly (${DAY_NAMES[scheduledDay]})`;
  }
  return "Weekly";
}

function ordinalSuffix(d: number): string {
  if (d === 1 || d === 21 || d === 31) return "st";
  if (d === 2 || d === 22) return "nd";
  if (d === 3 || d === 23) return "rd";
  return "th";
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  INCOME: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  BUSINESS_EXPENSE: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  PERSONAL_EXPENSE: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  OWNER_DRAW: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  INVESTMENT: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

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

interface WeeklyEntry {
  weekStart: string;
  lineItems: { category: string; amount: number }[];
  investments: { amount: number }[];
}

export default function RecurringManager() {
  const { canEdit } = useSubscription();
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [actualMonthlyIncome, setActualMonthlyIncome] = useState(0);
  const [actualMonthlyExpenses, setActualMonthlyExpenses] = useState(0);
  const [actualMonthlyInvesting, setActualMonthlyInvesting] = useState(0);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<Category | "INVESTMENT">("INCOME");
  const [newFrequency, setNewFrequency] = useState("WEEKLY");
  const [newScheduledDay, setNewScheduledDay] = useState(-1);
  const [newReminder, setNewReminder] = useState("");
  const [newReminderFrequency, setNewReminderFrequency] = useState("WEEKLY");
  const [newReminderScheduledDay, setNewReminderScheduledDay] = useState(-1);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/recurring").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/reminders").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/entries?yearOnly=true").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([itemsData, remindersData, entries]) => {
        setItems(itemsData);
        setReminders(remindersData);

        // Calculate actuals for the current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const monthEntries = (entries as WeeklyEntry[]).filter((e) => {
          const ws = new Date(e.weekStart);
          return ws >= monthStart && ws <= monthEnd;
        });
        const monthLineItems = monthEntries.flatMap((e) => e.lineItems);
        setActualMonthlyIncome(
          monthLineItems.filter((i) => i.category === "INCOME").reduce((sum, i) => sum + i.amount, 0)
        );
        setActualMonthlyExpenses(
          monthLineItems.filter((i) => i.category !== "INCOME").reduce((sum, i) => sum + i.amount, 0)
        );
        setActualMonthlyInvesting(
          monthEntries.flatMap((e) => e.investments).reduce((sum, i) => sum + i.amount, 0)
        );
      })
      .catch(() => {});
  }, []);

  async function addItem() {
    if (!canEdit) return;
    if (!newDescription || !newAmount) {
      setError("Description and amount are required.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newDescription,
          amount: parseFloat(newAmount),
          category: newCategory,
          frequency: newFrequency,
          scheduledDay: newScheduledDay,
        }),
      });
      if (!res.ok) throw new Error(`Failed to add item (${res.status})`);
      const item = await res.json();
      setItems([item, ...items]);
      setNewDescription("");
      setNewAmount("");
      setNewScheduledDay(-1);
      setShowAddItem(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add item");
    }
  }

  async function toggleItem(item: RecurringItem) {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/recurring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
    } catch {}
  }

  async function deleteItem(id: string) {
    if (!canEdit) return;
    try {
      await fetch("/api/recurring", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setItems(items.filter((i) => i.id !== id));
    } catch {}
  }

  async function addReminder() {
    if (!canEdit) return;
    if (!newReminder) {
      setError("Reminder message is required.");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newReminder,
          frequency: newReminderFrequency,
          scheduledDay: newReminderScheduledDay,
        }),
      });
      if (!res.ok) throw new Error(`Failed to add reminder (${res.status})`);
      const reminder = await res.json();
      setReminders([reminder, ...reminders]);
      setNewReminder("");
      setNewReminderScheduledDay(-1);
      setShowAddReminder(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add reminder");
    }
  }

  async function toggleReminder(reminder: Reminder) {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/reminders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reminder, isActive: !reminder.isActive }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setReminders(reminders.map((r) => (r.id === updated.id ? updated : r)));
    } catch {}
  }

  async function deleteReminder(id: string) {
    if (!canEdit) return;
    try {
      await fetch("/api/reminders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setReminders(reminders.filter((r) => r.id !== id));
    } catch {}
  }

  const categoryOptions = Object.entries(CATEGORIES).map(([key, label]) => ({ key, label }));

  // ── Summary calculations ──
  const activeItems = items.filter((i) => i.isActive);
  const monthlyIncome = activeItems
    .filter((i) => i.category === "INCOME")
    .reduce((sum, i) => sum + (i.frequency === "WEEKLY" ? i.amount * 4.33 : i.amount), 0);
  const monthlyExpenses = activeItems
    .filter((i) => i.category !== "INCOME" && i.category !== "INVESTMENT")
    .reduce((sum, i) => sum + (i.frequency === "WEEKLY" ? i.amount * 4.33 : i.amount), 0);
  const monthlyInvestments = activeItems
    .filter((i) => i.category === "INVESTMENT")
    .reduce((sum, i) => sum + (i.frequency === "WEEKLY" ? i.amount * 4.33 : i.amount), 0);
  const netMonthly = monthlyIncome - monthlyExpenses - monthlyInvestments;

  const incomeItems = items.filter((i) => i.category === "INCOME");
  const expenseItems = items.filter((i) => i.category !== "INCOME" && i.category !== "INVESTMENT");
  const investmentItems = items.filter((i) => i.category === "INVESTMENT");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Recurring & Reminders</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage your regular income, expenses, and reminders. Active items automatically affect your net worth.
          </p>
        </div>
      </div>

      <ExpiredBanner compact message="Your free trial has ended. Choose a plan to manage recurring items and reminders." />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Monthly Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {new Date().toLocaleString("default", { month: "long" })} Revenue
            </p>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(actualMonthlyIncome)}</p>
          <p className="text-xs text-slate-400 mt-1">Est. {formatCurrency(monthlyIncome)}/mo from recurring</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {new Date().toLocaleString("default", { month: "long" })} Expenses
            </p>
          </div>
          <p className="text-2xl font-bold text-red-500">{formatCurrency(monthlyExpenses)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              {new Date().toLocaleString("default", { month: "long" })} Investing
            </p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(actualMonthlyInvesting)}</p>
          <p className="text-xs text-slate-400 mt-1">Est. {formatCurrency(monthlyInvestments)}/mo from recurring</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <p className="text-xs text-slate-500 uppercase tracking-wide">Net Cash Flow</p>
          </div>
          {(() => {
            const actualNet = actualMonthlyIncome - monthlyExpenses - actualMonthlyInvesting;
            return (
              <p className={`text-2xl font-bold ${actualNet >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {formatCurrency(actualNet)}
              </p>
            );
          })()}
        </div>
      </div>

      {/* ── Recurring Items Section ── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Recurring Items</h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeItems.length} active of {items.length} total</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              {showAddItem ? "Cancel" : "+ Add Item"}
            </button>
          )}
        </div>

        {/* Add Item Form */}
        {showAddItem && (
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Description *</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Rent"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Amount *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as Category)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Frequency</label>
                <select
                  value={newFrequency}
                  onChange={(e) => { setNewFrequency(e.target.value); setNewScheduledDay(-1); }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Scheduled Day</label>
                <select
                  value={newScheduledDay}
                  onChange={(e) => setNewScheduledDay(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  {newFrequency === "WEEKLY" ? (
                    <>
                      <option value={-1}>Any day</option>
                      {DAY_NAMES.map((name, i) => (
                        <option key={i} value={i}>{name}</option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value={-1}>Any date</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}{ordinalSuffix(d)}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={addItem}
                  className="w-full bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  Add Recurring Item
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="divide-y divide-slate-50">
          {items.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">
              <p className="text-sm">No recurring items yet. Add your first one above.</p>
            </div>
          ) : (
            <>
              {/* Income items */}
              {incomeItems.length > 0 && (
                <div className="px-6 py-3">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Income</p>
                  <div className="space-y-2">
                    {incomeItems.map((item) => {
                      const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.INCOME;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                            item.isActive
                              ? `${colors.bg} ${colors.border}`
                              : "bg-slate-50 border-slate-100 opacity-50"
                          }`}
                        >
                          <button
                            onClick={() => toggleItem(item)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              item.isActive
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 hover:border-slate-400"
                            }`}
                          >
                            {item.isActive && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-slate-800 ${!item.isActive && "line-through text-slate-500"}`}>
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.frequency === "MONTHLY"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {formatSchedule(item.frequency, item.scheduledDay)}
                              </span>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-emerald-600 flex-shrink-0">
                            +{formatCurrency(item.amount)}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Expense items */}
              {expenseItems.length > 0 && (
                <div className="px-6 py-3">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Expenses & Draws</p>
                  <div className="space-y-2">
                    {expenseItems.map((item) => {
                      const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.PERSONAL_EXPENSE;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                            item.isActive
                              ? `${colors.bg} ${colors.border}`
                              : "bg-slate-50 border-slate-100 opacity-50"
                          }`}
                        >
                          <button
                            onClick={() => toggleItem(item)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              item.isActive
                                ? "bg-red-500 border-red-500 text-white"
                                : "border-slate-300 hover:border-slate-400"
                            }`}
                          >
                            {item.isActive && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-slate-800 ${!item.isActive && "line-through text-slate-500"}`}>
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                                {CATEGORIES[item.category as Category] || item.category}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.frequency === "MONTHLY"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {formatSchedule(item.frequency, item.scheduledDay)}
                              </span>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-red-500 flex-shrink-0">
                            -{formatCurrency(item.amount)}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Investment items */}
              {investmentItems.length > 0 && (
                <div className="px-6 py-3">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Investments</p>
                  <div className="space-y-2">
                    {investmentItems.map((item) => {
                      const colors = CATEGORY_COLORS.INVESTMENT;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                            item.isActive
                              ? `${colors.bg} ${colors.border}`
                              : "bg-slate-50 border-slate-100 opacity-50"
                          }`}
                        >
                          <button
                            onClick={() => toggleItem(item)}
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                              item.isActive
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "border-slate-300 hover:border-slate-400"
                            }`}
                          >
                            {item.isActive && (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-slate-800 ${!item.isActive && "line-through text-slate-500"}`}>
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.frequency === "MONTHLY"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}>
                                {formatSchedule(item.frequency, item.scheduledDay)}
                              </span>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-blue-600 flex-shrink-0">
                            {formatCurrency(item.amount)}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Reminders Section ── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-800">Reminders</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {reminders.filter((r) => r.isActive).length} active of {reminders.length} total
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddReminder(!showAddReminder)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              {showAddReminder ? "Cancel" : "+ Add Reminder"}
            </button>
          )}
        </div>

        {/* Add Reminder Form */}
        {showAddReminder && (
          <div className="px-6 py-4 bg-amber-50/50 border-b border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Message *</label>
                <input
                  type="text"
                  placeholder="e.g., Pay sisters for social media work"
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Frequency</label>
                <select
                  value={newReminderFrequency}
                  onChange={(e) => { setNewReminderFrequency(e.target.value); setNewReminderScheduledDay(-1); }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Scheduled Day</label>
                <div className="flex gap-2">
                  <select
                    value={newReminderScheduledDay}
                    onChange={(e) => setNewReminderScheduledDay(parseInt(e.target.value))}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    {newReminderFrequency === "WEEKLY" ? (
                      <>
                        <option value={-1}>Any day</option>
                        {DAY_NAMES.map((name, i) => (
                          <option key={i} value={i}>{name}</option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value={-1}>Any date</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d}{ordinalSuffix(d)}</option>
                        ))}
                      </>
                    )}
                  </select>
                  <button
                    onClick={addReminder}
                    className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reminders List */}
        <div className="divide-y divide-slate-50">
          {reminders.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">
              <p className="text-sm">No reminders yet. Add your first one above.</p>
            </div>
          ) : (
            reminders.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 px-6 py-3 transition-all ${
                  !r.isActive && "opacity-50"
                }`}
              >
                <button
                  onClick={() => toggleReminder(r)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    r.isActive
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {r.isActive && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-slate-800 ${!r.isActive && "line-through text-slate-500"}`}>
                    {r.message}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.frequency === "MONTHLY"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {formatSchedule(r.frequency, r.scheduledDay)}
                  </span>
                </div>
                <button
                  onClick={() => deleteReminder(r.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
