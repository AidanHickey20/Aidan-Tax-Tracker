"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type Category, formatCurrency } from "@/lib/utils";

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

export default function RecurringManager() {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
    fetch("/api/recurring").then((r) => r.json()).then(setItems);
    fetch("/api/reminders").then((r) => r.json()).then(setReminders);
  }, []);

  async function addItem() {
    if (!newDescription || !newAmount) return;
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add item");
    }
  }

  async function toggleItem(item: RecurringItem) {
    const res = await fetch("/api/recurring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, isActive: !item.isActive }),
    });
    const updated = await res.json();
    setItems(items.map((i) => (i.id === updated.id ? updated : i)));
  }

  async function deleteItem(id: string) {
    await fetch("/api/recurring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems(items.filter((i) => i.id !== id));
  }

  async function addReminder() {
    if (!newReminder) return;
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add reminder");
    }
  }

  async function toggleReminder(reminder: Reminder) {
    const res = await fetch("/api/reminders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...reminder, isActive: !reminder.isActive }),
    });
    const updated = await res.json();
    setReminders(reminders.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function deleteReminder(id: string) {
    await fetch("/api/reminders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setReminders(reminders.filter((r) => r.id !== id));
  }

  const categoryOptions = [
    ...Object.entries(CATEGORIES).map(([key, label]) => ({ key, label })),
  ];

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Recurring Items & Reminders
      </h2>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── Add Recurring Item ── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-4">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Add Recurring Item</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="flex-1 min-w-[140px] border border-slate-300 rounded px-2.5 py-1.5 text-sm"
          />
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="w-24 border border-slate-300 rounded px-2.5 py-1.5 text-sm"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {categoryOptions.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <select
            value={newFrequency}
            onChange={(e) => { setNewFrequency(e.target.value); setNewScheduledDay(-1); }}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <select
            value={newScheduledDay}
            onChange={(e) => setNewScheduledDay(parseInt(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
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
                  <option key={d} value={d}>{d}{d === 1 || d === 21 || d === 31 ? "st" : d === 2 || d === 22 ? "nd" : d === 3 || d === 23 ? "rd" : "th"}</option>
                ))}
              </>
            )}
          </select>
          <button
            onClick={addItem}
            className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Add Reminder ── */}
      <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm mb-6">
        <h3 className="font-semibold text-slate-700 text-sm mb-3">Add Reminder</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="e.g., Pay sisters for social media work"
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            className="flex-1 min-w-[200px] border border-slate-300 rounded px-2.5 py-1.5 text-sm"
          />
          <select
            value={newReminderFrequency}
            onChange={(e) => { setNewReminderFrequency(e.target.value); setNewReminderScheduledDay(-1); }}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
          <select
            value={newReminderScheduledDay}
            onChange={(e) => setNewReminderScheduledDay(parseInt(e.target.value))}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm"
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
                  <option key={d} value={d}>{d}{d === 1 || d === 21 || d === 31 ? "st" : d === 2 || d === 22 ? "nd" : d === 3 || d === 23 ? "rd" : "th"}</option>
                ))}
              </>
            )}
          </select>
          <button
            onClick={addReminder}
            className="bg-amber-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-amber-600"
          >
            Add
          </button>
        </div>
      </div>

      {/* ── Items & Reminders List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Recurring Items */}
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              item.isActive
                ? "bg-white border-slate-200"
                : "bg-slate-50 border-slate-100 opacity-50"
            }`}
          >
            <button
              onClick={() => toggleItem(item)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                item.isActive
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-slate-300"
              }`}
            >
              {item.isActive && "✓"}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-slate-700 truncate ${!item.isActive && "line-through"}`}>
                {item.description}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-emerald-600">
                  {formatCurrency(item.amount)}
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {CATEGORIES[item.category as Category] || item.category}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  item.frequency === "MONTHLY"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}>
                  {formatSchedule(item.frequency, item.scheduledDay)}
                </span>
              </div>
            </div>
            <button
              onClick={() => deleteItem(item.id)}
              className="text-red-300 hover:text-red-500 text-lg flex-shrink-0 leading-none"
            >
              &times;
            </button>
          </div>
        ))}

        {/* Reminders */}
        {reminders.map((r) => (
          <div
            key={r.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
              r.isActive
                ? "bg-amber-50 border-amber-200"
                : "bg-slate-50 border-slate-100 opacity-50"
            }`}
          >
            <button
              onClick={() => toggleReminder(r)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                r.isActive
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "border-slate-300"
              }`}
            >
              {r.isActive && "✓"}
            </button>
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-slate-700 truncate ${!r.isActive && "line-through"}`}>
                {r.message}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                  Reminder
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  r.frequency === "MONTHLY"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-amber-50 text-amber-600"
                }`}>
                  {formatSchedule(r.frequency, r.scheduledDay)}
                </span>
              </div>
            </div>
            <button
              onClick={() => deleteReminder(r.id)}
              className="text-red-300 hover:text-red-500 text-lg flex-shrink-0 leading-none"
            >
              &times;
            </button>
          </div>
        ))}

        {items.length === 0 && reminders.length === 0 && (
          <p className="text-sm text-slate-400 col-span-2 text-center py-4">
            No recurring items or reminders yet.
          </p>
        )}
      </div>
    </div>
  );
}
