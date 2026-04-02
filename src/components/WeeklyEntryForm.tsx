"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentWeekRange, formatCurrency, type Category } from "@/lib/utils";
import { format } from "date-fns";
import { useSubscription } from "./SubscriptionProvider";
import ExpiredBanner from "./ExpiredBanner";

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
  const { canEdit } = useSubscription();

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
  const [savedDescriptions, setSavedDescriptions] = useState<Record<string, string[]>>({});

  // Draft state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const isEditMode = !!editId;

  // Build payload from current form state
  const buildPayload = useCallback(
    (status: "DRAFT" | "SUBMITTED") => ({
      weekStart,
      weekEnd,
      mileage: parseFloat(mileage) || 0,
      notes,
      status,
      lineItems: lineItems
        .filter((i) => i.description || i.amount)
        .map((i) => ({
          description: i.description || "(untitled)",
          amount: parseFloat(i.amount) || 0,
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
        .filter((inv) => inv.name || inv.amount)
        .map((inv) => ({
          name: inv.name || "(untitled)",
          amount: parseFloat(inv.amount) || 0,
        })),
    }),
    [weekStart, weekEnd, mileage, notes, lineItems, balances, investments, userAccounts]
  );

  // Auto-save draft (only in new entry mode, not edit mode)
  const saveDraft = useCallback(async () => {
    if (isEditMode || !canEdit) return;

    setAutoSaveStatus("saving");
    const payload = buildPayload("DRAFT");

    try {
      if (draftId) {
        // Update existing draft
        await fetch(`/api/entries/${draftId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new draft
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.id) setDraftId(data.id);
      }
      setLastSaved(new Date());
      setAutoSaveStatus("saved");
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [isEditMode, canEdit, buildPayload, draftId]);

  // Schedule auto-save on form changes (debounced 2s)
  const scheduleAutoSave = useCallback(() => {
    if (isEditMode || !initialLoadDone.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus("idle");
    autoSaveTimer.current = setTimeout(() => {
      saveDraft();
    }, 2000);
  }, [isEditMode, saveDraft]);

  // Trigger auto-save when form data changes
  useEffect(() => {
    scheduleAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [lineItems, balances, investments, mileage, notes, scheduleAutoSave]);

  // Load recurring items, reminders, portfolio investments, and user accounts
  useEffect(() => {
    Promise.all([
      fetch("/api/recurring").then((r) => r.json()),
      fetch("/api/reminders").then((r) => r.json()),
      fetch("/api/portfolio").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([recurringItems, remindersData, portfolioItems, accounts, settingsData]) => {
      setUserAccounts(accounts.filter((a: UserAccount) => a.isActive));
      setReminders(remindersData.filter((r: Reminder) => r.isActive));
      if (settingsData.savedDescriptions) setSavedDescriptions(settingsData.savedDescriptions);

      if (!editId) {
        // Check for existing draft for this week first
        const ws = format(start, "yyyy-MM-dd");
        const we = format(end, "yyyy-MM-dd");
        fetch(`/api/entries?draft=true&weekStart=${ws}&weekEnd=${we}`)
          .then((r) => r.json())
          .then((draft) => {
            if (draft && draft.id) {
              // Restore draft
              setDraftId(draft.id);
              setWeekStart(format(new Date(draft.weekStart), "yyyy-MM-dd"));
              setWeekEnd(format(new Date(draft.weekEnd), "yyyy-MM-dd"));
              setMileage(draft.mileage ? draft.mileage.toString() : "");
              setNotes(draft.notes || "");
              setLineItems(
                draft.lineItems.map(
                  (i: { description: string; amount: number; category: string }) => ({
                    tempId: tempId(),
                    description: i.description === "(untitled)" ? "" : i.description,
                    amount: i.amount ? i.amount.toString() : "",
                    category: i.category as Category,
                  })
                )
              );
              const balanceMap: Record<string, string> = {};
              draft.accountBalances.forEach(
                (b: { accountName: string; balance: number }) => {
                  balanceMap[b.accountName] = b.balance ? b.balance.toString() : "";
                }
              );
              setBalances(balanceMap);

              // Merge portfolio auto-invest with saved draft investments
              const autoInvestItems = portfolioItems.filter(
                (inv: { recurringAmount: number }) => inv.recurringAmount > 0
              );
              const savedInvMap = new Map<string, number>();
              draft.investments.forEach(
                (inv: { name: string; amount: number }) => {
                  savedInvMap.set(inv.name, inv.amount);
                }
              );
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
              const portfolioNames = autoInvestItems.map(
                (inv: { name: string }) => inv.name
              );
              const extraInvs: InvestmentInput[] = draft.investments
                .filter(
                  (inv: { name: string; amount: number }) =>
                    inv.name !== "(untitled)" && !portfolioNames.includes(inv.name)
                )
                .map((inv: { name: string; amount: number }) => ({
                  tempId: tempId(),
                  name: inv.name,
                  amount: inv.amount.toString(),
                }));
              setInvestments([...portfolioInvs, ...extraInvs]);
              setLastSaved(new Date(draft.updatedAt));
              // Mark load done after restoring draft
              setTimeout(() => {
                initialLoadDone.current = true;
              }, 100);
            } else {
              // No draft — pre-fill from recurring items
              prefillFromRecurring(recurringItems, portfolioItems);
              setTimeout(() => {
                initialLoadDone.current = true;
              }, 100);
            }
          })
          .catch(() => {
            prefillFromRecurring(recurringItems, portfolioItems);
            setTimeout(() => {
              initialLoadDone.current = true;
            }, 100);
          });
      } else {
        initialLoadDone.current = true;
      }
    });
  }, [editId]);

  function prefillFromRecurring(
    recurringItems: RecurringItem[],
    portfolioItems: { name: string; recurringAmount: number }[]
  ) {
    const weekStartDate = new Date(start);
    const weekEndDate = new Date(end);

    const activeItems = recurringItems.filter((r: RecurringItem) => {
      if (!r.isActive) return false;
      if (r.frequency === "WEEKLY") return true;
      if (r.frequency === "MONTHLY") {
        const day = r.scheduledDay;
        if (day < 1) {
          return weekStartDate.getDate() <= 7;
        }
        const month = weekStartDate.getMonth();
        const year = weekStartDate.getFullYear();
        const scheduled = new Date(year, month, day);
        if (scheduled.getMonth() !== month) {
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

  // Load existing entry when editing (also fetch portfolio for investment labels)
  useEffect(() => {
    if (editId) {
      Promise.all([
        fetch(`/api/entries/${editId}`).then((r) => r.json()),
        fetch("/api/portfolio").then((r) => r.json()),
      ]).then(([entry, portfolioItems]) => {
        setWeekStart(format(new Date(entry.weekStart), "yyyy-MM-dd"));
        setWeekEnd(format(new Date(entry.weekEnd), "yyyy-MM-dd"));
        setMileage(entry.mileage ? entry.mileage.toString() : "");
        setNotes(entry.notes);
        setLineItems(
          entry.lineItems.map(
            (i: { description: string; amount: number; category: string }) => ({
              tempId: tempId(),
              description: i.description,
              amount: i.amount.toString(),
              category: i.category as Category,
            })
          )
        );
        const balanceMap: Record<string, string> = {};
        entry.accountBalances.forEach(
          (b: { accountName: string; balance: number }) => {
            balanceMap[b.accountName] = b.balance ? b.balance.toString() : "";
          }
        );
        setBalances(balanceMap);

        const autoInvestItems = portfolioItems.filter(
          (inv: { recurringAmount: number }) => inv.recurringAmount > 0
        );

        const savedInvMap = new Map<string, number>();
        entry.investments.forEach(
          (inv: { name: string; amount: number }) => {
            savedInvMap.set(inv.name, inv.amount);
          }
        );

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

        const portfolioNames = autoInvestItems.map(
          (inv: { name: string }) => inv.name
        );
        const extraInvs: InvestmentInput[] = entry.investments
          .filter(
            (inv: { name: string; amount: number }) =>
              !portfolioNames.includes(inv.name)
          )
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
    setLineItems([
      ...lineItems,
      { tempId: tempId(), description: "", amount: "", category },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems(lineItems.filter((i) => i.tempId !== id));
  }

  function updateLineItem(
    id: string,
    field: "description" | "amount",
    value: string
  ) {
    setLineItems(
      lineItems.map((i) => (i.tempId === id ? { ...i, [field]: value } : i))
    );
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

  function updateInvestment(
    id: string,
    field: "name" | "amount",
    value: string
  ) {
    setInvestments(
      investments.map((inv) =>
        inv.tempId === id ? { ...inv, [field]: value } : inv
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Clear any pending auto-save
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    const payload = buildPayload("SUBMITTED");

    // If we have a draft, update it to SUBMITTED; otherwise create new
    const entryId = draftId || editId;
    const url = entryId ? `/api/entries/${entryId}` : "/api/entries";
    const method = entryId ? "PUT" : "POST";

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

  const categoryGroups: {
    category: Category;
    label: string;
    color: string;
  }[] = [
    {
      category: "INCOME",
      label: "Income",
      color: "border-emerald-300 bg-emerald-900/30",
    },
    {
      category: "BUSINESS_EXPENSE",
      label: "Business Expenses",
      color: "border-red-300 bg-red-900/30",
    },
    {
      category: "PERSONAL_EXPENSE",
      label: "Personal Expenses",
      color: "border-orange-300 bg-orange-900/30",
    },
    {
      category: "OWNER_DRAW",
      label: "Owner Draws / Transfers",
      color: "border-blue-300 bg-blue-900/30",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-100">
          {editId ? "Edit Weekly Entry" : "New Weekly Entry"}
        </h2>
        {/* Auto-save status indicator (new entries only) */}
        {!isEditMode && (
          <div className="flex items-center gap-2 text-sm">
            {autoSaveStatus === "saving" && (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Saving draft...
              </span>
            )}
            {autoSaveStatus === "saved" && lastSaved && (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                Draft saved {lastSaved.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
            {autoSaveStatus === "idle" && draftId && (
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-500" />
                Draft
              </span>
            )}
          </div>
        )}
      </div>

      <ExpiredBanner
        compact
        message="Your free trial has ended. Choose a plan to add or edit entries."
      />

      {/* Draft banner */}
      {!isEditMode && draftId && (
        <div className="mb-4 bg-indigo-900/30 border border-indigo-600 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 text-sm font-medium">
              Draft in progress
            </span>
            <span className="text-indigo-400/60 text-xs">
              — your changes are automatically saved
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!confirm("Discard this draft and start fresh?")) return;
              if (draftId) {
                await fetch(`/api/entries/${draftId}`, { method: "DELETE" });
              }
              setDraftId(null);
              setLineItems([]);
              setBalances({});
              setInvestments([]);
              setMileage("");
              setNotes("");
              setAutoSaveStatus("idle");
              setLastSaved(null);
              initialLoadDone.current = false;
              // Re-trigger to prefill from recurring
              window.location.reload();
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
          >
            Discard draft
          </button>
        </div>
      )}

      {/* Reminders */}
      {reminders.length > 0 && (
        <div className="mb-6 bg-amber-900/30 border border-amber-700 rounded-lg p-4">
          <h3 className="font-semibold text-amber-400 text-sm mb-2">
            Don&apos;t forget:
          </h3>
          <ul className="space-y-1">
            {reminders.map((r) => (
              <li
                key={r.id}
                className="text-sm text-amber-400 flex items-center gap-2"
              >
                <span>&#8226;</span> {r.message}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    r.frequency === "MONTHLY"
                      ? "bg-blue-900/30 text-blue-400"
                      : "bg-amber-700 text-amber-400"
                  }`}
                >
                  {r.frequency === "MONTHLY" ? "Monthly" : "Weekly"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Week Date Range */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-200 mb-3">Week Period</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Line Item Groups */}
      {categoryGroups.map(({ category, label, color }) => {
        const items = lineItems.filter((i) => i.category === category);
        const total = items.reduce(
          (sum, i) => sum + (parseFloat(i.amount) || 0),
          0
        );
        return (
          <div
            key={category}
            className={`border rounded-lg p-4 mb-4 shadow-sm ${color}`}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-200">{label}</h3>
              {total > 0 && (
                <span className="text-sm font-medium text-slate-300">
                  Total: {formatCurrency(total)}
                </span>
              )}
            </div>
            {/* Quick-add chips from saved descriptions */}
            {(savedDescriptions[category] || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {savedDescriptions[category].map((desc) => (
                  <button
                    key={desc}
                    type="button"
                    onClick={() => {
                      setLineItems((prev) => [
                        ...prev,
                        {
                          tempId: tempId(),
                          description: desc,
                          amount: "",
                          category,
                        },
                      ]);
                    }}
                    className="text-xs px-2.5 py-1 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  >
                    + {desc}
                  </button>
                ))}
              </div>
            )}
            {items.map((item) => (
              <div key={item.tempId} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateLineItem(item.tempId, "description", e.target.value)
                  }
                  className="flex-1 border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  step="0.01"
                  value={item.amount}
                  onChange={(e) =>
                    updateLineItem(item.tempId, "amount", e.target.value)
                  }
                  className="w-32 border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
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
              className="text-sm text-slate-400 hover:text-slate-200 mt-1"
            >
              + Add {label.replace(/s$/, "")}
            </button>
          </div>
        );
      })}

      {/* Account Balances */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-200 mb-3">Account Balances</h3>

        {/* Standalone accounts (no group) */}
        {userAccounts
          .filter((a) => !a.group)
          .map((account) => (
            <div key={account.id} className="flex items-center gap-2 mb-2">
              <label className="flex-1 text-sm text-slate-300">
                {account.name}
              </label>
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
          userAccounts
            .filter((a) => a.group)
            .forEach((a) => {
              const list = groups.get(a.group!) || [];
              list.push(a);
              groups.set(a.group!, list);
            });
          return Array.from(groups.entries()).map(([groupName, accounts]) => (
            <div
              key={groupName}
              className="mt-4 border-t border-slate-700 pt-3"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200">
                  {groupName}
                </span>
                <span className="text-sm font-medium text-slate-400">
                  Total:{" "}
                  {formatCurrency(
                    accounts.reduce(
                      (sum, a) =>
                        sum + (parseFloat(balances[a.name] || "0") || 0),
                      0
                    )
                  )}
                </span>
              </div>
              {accounts.map((account) => {
                const displayLabel = account.group
                  ? account.name.replace(`${account.group} - `, "")
                  : account.name;
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-2 mb-2 ml-4"
                  >
                    <label className="flex-1 text-sm text-slate-400">
                      {displayLabel}
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={balances[account.name] || ""}
                      onChange={(e) =>
                        updateBalance(account.name, e.target.value)
                      }
                      className="w-40 border border-slate-600 rounded-lg px-3 py-2 text-sm text-right bg-slate-900 text-slate-100 placeholder-slate-500"
                    />
                  </div>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Investments */}
      <div className="bg-indigo-900/30 border border-indigo-200 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-slate-200">Investments</h3>
          {investments.length > 0 && (
            <span className="text-sm font-medium text-slate-300">
              Total:{" "}
              {formatCurrency(
                investments.reduce(
                  (sum, inv) => sum + (parseFloat(inv.amount) || 0),
                  0
                )
              )}
            </span>
          )}
        </div>
        {/* Recurring investments - fixed labels, editable amounts */}
        {investments
          .filter((inv) => inv.isRecurring)
          .map((inv) => (
            <div key={inv.tempId} className="flex items-center gap-2 mb-2">
              <label className="flex-1 text-sm text-slate-300">
                {inv.name}
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={inv.amount}
                onChange={(e) =>
                  updateInvestment(inv.tempId, "amount", e.target.value)
                }
                className="w-40 border border-slate-600 rounded-lg px-3 py-2 text-sm text-right bg-slate-900 text-slate-100 placeholder-slate-500"
              />
            </div>
          ))}
        {/* Extra one-off investments */}
        {investments
          .filter((inv) => !inv.isRecurring)
          .map((inv) => (
            <div key={inv.tempId} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Investment Name"
                value={inv.name}
                onChange={(e) =>
                  updateInvestment(inv.tempId, "name", e.target.value)
                }
                className="flex-1 border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
              />
              <input
                type="number"
                placeholder="Amount"
                step="0.01"
                value={inv.amount}
                onChange={(e) =>
                  updateInvestment(inv.tempId, "amount", e.target.value)
                }
                className="w-40 border border-slate-600 rounded-lg px-3 py-2 text-sm text-right bg-slate-900 text-slate-100 placeholder-slate-500"
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
          className="text-sm text-slate-400 hover:text-slate-200 mt-1"
        >
          + Add Investment
        </button>
      </div>

      {/* Mileage */}
      <div className="bg-purple-900/30 border border-purple-200 rounded-lg p-4 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-200 mb-3">Mileage</h3>
        <input
          type="number"
          placeholder="Miles driven this week"
          step="0.1"
          value={mileage}
          onChange={(e) => setMileage(e.target.value)}
          className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
        />
      </div>

      {/* Notes */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 shadow-sm">
        <h3 className="font-semibold text-slate-200 mb-3">Notes</h3>
        <textarea
          placeholder="Any notes for this week..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm resize-none bg-slate-900 text-slate-100 placeholder-slate-500"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={saving || saved || !canEdit}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
          !canEdit
            ? "bg-slate-600 cursor-not-allowed"
            : saved
            ? "bg-emerald-500"
            : saving
            ? "bg-slate-500 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {!canEdit
          ? "Choose a plan to save entries"
          : saved
          ? "Submitted! Redirecting..."
          : saving
          ? "Submitting..."
          : editId
          ? "Update Entry"
          : "Submit Weekly Entry"}
      </button>
    </form>
  );
}
