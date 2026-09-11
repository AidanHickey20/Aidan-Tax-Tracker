"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";

interface LinkedBank {
  id: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
}

export default function LinkedCards() {
  const [banks, setBanks] = useState<LinkedBank[]>([]);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadBanks = useCallback(async () => {
    const res = await fetch("/api/plaid/banks");
    if (res.ok) setBanks(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBanks();
  }, [loadBanks]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: { institution?: { institution_id?: string; name?: string } | null }) => {
      setBusy(true);
      setStatus("Linking…");
      await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicToken,
          institutionId: metadata.institution?.institution_id,
          institutionName: metadata.institution?.name,
        }),
      });
      setStatus("Importing transactions…");
      await fetch("/api/plaid/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setLinkToken(null);
      setBusy(false);
      setStatus(null);
      loadBanks();
    },
    [loadBanks]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => onPlaidSuccess(public_token, metadata),
    onExit: () => {
      setLinkToken(null);
      setBusy(false);
      setStatus(null);
    },
  });

  // Open Plaid Link as soon as a link token is fetched and the SDK is ready.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  const startLink = async () => {
    setBusy(true);
    setStatus("Preparing…");
    const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
    if (!res.ok) {
      setStatus("Could not start linking. Try again.");
      setBusy(false);
      return;
    }
    const { linkToken } = await res.json();
    setLinkToken(linkToken);
  };

  const syncNow = async () => {
    setBusy(true);
    setStatus("Syncing…");
    const res = await fetch("/api/plaid/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? `Imported ${data.imported ?? 0} transaction(s).` : data.error || "Sync failed.");
    setBusy(false);
    loadBanks();
  };

  const disconnect = async (bankId: string) => {
    setBusy(true);
    await fetch("/api/plaid/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId }),
    });
    setBusy(false);
    loadBanks();
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-slate-200 mb-1">Linked Cards & Accounts</h3>
      <p className="text-sm text-slate-400 mb-4">
        Connect a credit card or bank. New purchases show up in a quick review each time you log in, where you sort
        them into business or personal.
      </p>

      {banks.length > 0 && (
        <ul className="mb-4 divide-y divide-slate-700">
          {banks.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{b.institutionName || "Linked account"}</p>
                <p className="text-xs text-slate-500">
                  {b.lastSyncedAt ? `Last synced ${new Date(b.lastSyncedAt).toLocaleString()}` : "Not synced yet"}
                </p>
              </div>
              <button
                onClick={() => disconnect(b.id)}
                disabled={busy}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={startLink}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50"
        >
          + Connect a card
        </button>
        {banks.length > 0 && (
          <button
            onClick={syncNow}
            disabled={busy}
            className="border border-slate-600 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-50"
          >
            Sync now
          </button>
        )}
        {status && <span className="text-xs text-slate-400">{status}</span>}
      </div>
    </div>
  );
}
