"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSubscription } from "@/components/SubscriptionProvider";
import ExpiredBanner from "@/components/ExpiredBanner";
import RealEstatePortfolio from "@/components/RealEstatePortfolio";
import UpgradePrompt from "@/components/UpgradePrompt";

interface Settings {
  incomeGoal: number;
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

function Field({ label, value, onChange, prefix, suffix, step, hint }: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  hint?: string;
}) {
  // Show empty string instead of 0
  const displayValue = value === 0 || value === "0" ? "" : value;
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-slate-400">{prefix}</span>}
        <input
          type="number"
          step={step || "0.01"}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-900 text-slate-100 placeholder-slate-500"
        />
        {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const { canEdit, isProUser } = useSubscription();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          ...data,
          refDate: data.refDate ? new Date(data.refDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading || !settings) {
    return <div className="text-slate-500 py-8">Loading settings...</div>;
  }

  const update = (field: keyof Settings, value: string) => {
    const numFields = [
      "incomeGoal", "bankBalance", "homeValue", "homeAppreciation",
      "mortgageBalance", "mortgageRate", "mortgagePayment",
      "studentLoanBalance", "studentLoanRate", "studentLoanPayment", "studentLoanPaymentDay",
      "carLoanBalance", "carLoanRate", "carLoanPayment", "carLoanPaymentDay",
      "investmentGrowthRate",
    ];
    if (numFields.includes(field)) {
      setSettings({ ...settings, [field]: value === "" ? 0 : parseFloat(value) || 0 });
    } else {
      setSettings({ ...settings, [field]: value });
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-slate-500 hover:text-slate-300">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
      </div>

      <ExpiredBanner compact message="Your free trial has ended. Choose a plan to update settings." />

      <p className="text-sm text-slate-400 mb-8">
        Configure your financial starting points. These values are used to calculate your net worth and track progress.
        Leave fields at 0 if they don&apos;t apply to you.
      </p>

      <div className="space-y-8">
        {/* Income Goal */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Income Goal</h3>
          <Field
            label="Annual Income Goal"
            value={settings.incomeGoal}
            onChange={(v) => update("incomeGoal", v)}
            prefix="$"
            step="1000"
            hint="Shown in the progress bar at the top of the page"
          />
        </div>

        {/* Reference Date & Bank Balance */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Bank Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Reference Date</label>
              <input
                type="date"
                value={settings.refDate}
                onChange={(e) => update("refDate", e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">The date your starting balances are from</p>
            </div>
            <Field
              label="Starting Bank Balance"
              value={settings.bankBalance}
              onChange={(v) => update("bankBalance", v)}
              prefix="$"
              hint="Your bank balance as of the reference date"
            />
          </div>
        </div>

        {/* Real Estate Portfolio */}
        {isProUser ? <RealEstatePortfolio /> : <UpgradePrompt feature="Real Estate Portfolio" />}

        {/* Student Loans */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Student Loans</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Balance" value={settings.studentLoanBalance} onChange={(v) => update("studentLoanBalance", v)} prefix="$" />
            <Field label="Interest Rate" value={settings.studentLoanRate} onChange={(v) => update("studentLoanRate", v)} hint="e.g. 0.075 for 7.5%" step="0.001" />
            <Field label="Monthly Payment" value={settings.studentLoanPayment} onChange={(v) => update("studentLoanPayment", v)} prefix="$" suffix="/mo" />
            <Field label="Payment Day of Month" value={settings.studentLoanPaymentDay} onChange={(v) => update("studentLoanPaymentDay", v)} hint="1-31" step="1" />
          </div>
        </div>

        {/* Car Loan */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Car Loan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Balance" value={settings.carLoanBalance} onChange={(v) => update("carLoanBalance", v)} prefix="$" />
            <Field label="Interest Rate" value={settings.carLoanRate} onChange={(v) => update("carLoanRate", v)} hint="e.g. 0.04 for 4%" step="0.001" />
            <Field label="Monthly Payment" value={settings.carLoanPayment} onChange={(v) => update("carLoanPayment", v)} prefix="$" suffix="/mo" />
            <Field label="Payment Day of Month" value={settings.carLoanPaymentDay} onChange={(v) => update("carLoanPaymentDay", v)} hint="1-31" step="1" />
          </div>
        </div>
        {/* Investment Assumptions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Investment Assumptions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Annual Growth Rate"
              value={settings.investmentGrowthRate}
              onChange={(v) => update("investmentGrowthRate", v)}
              hint="Used for manual investment projections (e.g. 0.07 for 7%)"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving || !canEdit}
          className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
            !canEdit
              ? "bg-slate-600 text-white cursor-not-allowed"
              : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          }`}
        >
          {!canEdit ? "Choose a plan to save" : saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Settings saved!</span>
        )}
      </div>
    </div>
  );
}
