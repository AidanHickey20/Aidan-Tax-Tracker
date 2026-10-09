"use client";

import { useEffect, useState } from "react";

interface Business {
  id: string;
  name: string;
}

export default function BusinessManager() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/businesses");
      const d = await res.json();
      setBusinesses(d.businesses || []);
      setActiveId(d.activeBusinessId);
      setEnabled(!!d.multiBusinessEnabled);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleEnabled() {
    setBusy(true);
    await fetch("/api/businesses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", enabled: !enabled }),
    });
    // Reload so the business tabs in the top bar appear/disappear immediately.
    window.location.reload();
  }

  async function addBusiness() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Could not create business.");
      setBusy(false);
      return;
    }
    setNewName("");
    setBusy(false);
    load();
  }

  async function rename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await fetch("/api/businesses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename", businessId: id, name: trimmed }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Delete this business and ALL of its data (income, expenses, deals, documents)? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/businesses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      alert(b.error || "Could not delete business.");
    }
    // Reload in case the active business changed.
    window.location.reload();
  }

  if (loading) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-100">Multiple Businesses</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Track separate businesses, each with their own income, expenses, deals, mileage, and
            tax settings. Your net worth, loans, and investments stay shared.
          </p>
        </div>
        <button
          onClick={toggleEnabled}
          disabled={busy}
          role="switch"
          aria-checked={enabled}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-emerald-600" : "bg-slate-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="mt-5 border-t border-slate-700 pt-4 space-y-2">
          {businesses.map((b) => (
            <div key={b.id} className="flex items-center gap-2">
              <input
                defaultValue={b.name}
                onBlur={(e) => rename(b.id, e.target.value)}
                className="flex-1 border border-slate-600 rounded px-3 py-1.5 text-sm bg-slate-900 text-slate-100"
              />
              {b.id === activeId && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">active</span>
              )}
              <button
                onClick={() => remove(b.id)}
                disabled={busy || businesses.length <= 1}
                title={businesses.length <= 1 ? "You can't delete your only business" : "Delete business"}
                className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:hover:text-red-400 text-lg leading-none px-1"
              >
                &times;
              </button>
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBusiness()}
              placeholder="New business name"
              className="flex-1 border border-slate-600 rounded px-3 py-1.5 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
            />
            <button
              onClick={addBusiness}
              disabled={busy || !newName.trim()}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-slate-500 pt-1">
            Switch between businesses using the tabs at the top of the page.
          </p>
        </div>
      )}
    </div>
  );
}
