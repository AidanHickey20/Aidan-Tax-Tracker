"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type Category, formatCurrency } from "@/lib/utils";

interface RecurringItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  isActive: boolean;
}

interface Reminder {
  id: string;
  message: string;
  isActive: boolean;
}

export default function RecurringManager() {
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<Category | "INVESTMENT">("INCOME");
  const [newReminder, setNewReminder] = useState("");

  useEffect(() => {
    fetch("/api/recurring").then((r) => r.json()).then(setItems);
    fetch("/api/reminders").then((r) => r.json()).then(setReminders);
  }, []);

  async function addItem() {
    if (!newDescription || !newAmount) return;
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: newDescription,
        amount: parseFloat(newAmount),
        category: newCategory,
      }),
    });
    const item = await res.json();
    setItems([item, ...items]);
    setNewDescription("");
    setNewAmount("");
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
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newReminder }),
    });
    const reminder = await res.json();
    setReminders([reminder, ...reminders]);
    setNewReminder("");
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
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Recurring Items & Reminders
      </h2>

      {/* Recurring Items */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm mb-8">
        <h3 className="font-semibold text-slate-700 mb-4">
          Recurring Items
          <span className="text-sm font-normal text-slate-400 ml-2">
            Auto-fill into new weekly entries
          </span>
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Amount"
            step="0.01"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
          >
            {categoryOptions.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            onClick={addItem}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Add
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-400">No recurring items yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  item.isActive ? "bg-slate-50" : "bg-slate-100 opacity-60"
                }`}
              >
                <button
                  onClick={() => toggleItem(item)}
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                    item.isActive
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {item.isActive && "✓"}
                </button>
                <span className={`flex-1 text-sm ${!item.isActive && "line-through"}`}>
                  {item.description}
                </span>
                <span className="text-sm font-medium text-slate-600">
                  {formatCurrency(item.amount)}
                </span>
                <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
                  {CATEGORIES[item.category as Category] || item.category}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reminders */}
      <div className="bg-white border border-amber-200 rounded-lg p-6 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-4">
          Reminders
          <span className="text-sm font-normal text-slate-400 ml-2">
            Show on dashboard & weekly entry form
          </span>
        </h3>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="e.g., Pay sisters for social media work"
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={addReminder}
            className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600"
          >
            Add
          </button>
        </div>

        {reminders.length === 0 ? (
          <p className="text-sm text-slate-400">No reminders yet.</p>
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                  r.isActive ? "bg-amber-50" : "bg-slate-100 opacity-60"
                }`}
              >
                <button
                  onClick={() => toggleReminder(r)}
                  className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                    r.isActive
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-slate-300"
                  }`}
                >
                  {r.isActive && "✓"}
                </button>
                <span className={`flex-1 text-sm ${!r.isActive && "line-through"}`}>
                  {r.message}
                </span>
                <button
                  onClick={() => deleteReminder(r.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
