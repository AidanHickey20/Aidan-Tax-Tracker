"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const PUBLIC_ROUTES = new Set([
  "/login", "/signup", "/welcome", "/forgot-password", "/reset-password", "/terms", "/privacy",
]);

interface Business {
  id: string;
  name: string;
}

export default function BusinessTabs() {
  const pathname = usePathname();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (PUBLIC_ROUTES.has(pathname)) return;
    fetch("/api/businesses")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setBusinesses(d.businesses || []);
        setActiveId(d.activeBusinessId);
        setEnabled(!!d.multiBusinessEnabled);
      })
      .catch(() => {});
  }, [pathname]);

  if (PUBLIC_ROUTES.has(pathname) || !enabled || businesses.length === 0) return null;

  async function switchTo(id: string) {
    if (id === activeId || busy) return;
    setBusy(true);
    try {
      await fetch("/api/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setActive", businessId: id }),
      });
      // Reload so every screen re-fetches data for the newly active business.
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  async function addBusiness() {
    const name = window.prompt("Name this business (e.g. “Flipping LLC”):")?.trim();
    if (!name) return;
    setBusy(true);
    try {
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
      const created = await res.json();
      await fetch("/api/businesses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setActive", businessId: created.id }),
      });
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1 px-8 pt-3 overflow-x-auto">
      {businesses.map((b) => {
        const active = b.id === activeId;
        return (
          <button
            key={b.id}
            onClick={() => switchTo(b.id)}
            disabled={busy}
            className={`px-3 py-1.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              active
                ? "bg-slate-800 text-emerald-400 border-emerald-500"
                : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            {b.name}
          </button>
        );
      })}
      <button
        onClick={addBusiness}
        disabled={busy}
        title="Add a business"
        className="px-2.5 py-1.5 rounded-lg text-sm text-slate-500 hover:text-emerald-400 hover:bg-slate-800/50 disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  );
}
