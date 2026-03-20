"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSubscription } from "@/components/SubscriptionProvider";
import { useTheme } from "@/components/ThemeProvider";
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
  filingStatus: string;
  state: string;
  stateTaxRate: number;
  municipalTaxRate: number;
  mileageRate: number;
  additionalW2Income: number;
  rentalIncome: number;
}

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "Washington D.C." },
];

const FILING_STATUSES = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED_JOINT", label: "Married Filing Jointly" },
  { value: "MARRIED_SEPARATE", label: "Married Filing Separately" },
  { value: "HEAD_OF_HOUSEHOLD", label: "Head of Household" },
];

function Field({ label, value, onChange, prefix, suffix, step, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  suffix?: string;
  step?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-slate-400">{prefix}</span>}
        <input
          type="number"
          step={step || "0.01"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-900 text-slate-100 placeholder-slate-500"
        />
        {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

/** Convert a number from the API to a form string (0 → empty) */
function numToForm(val: number): string {
  return val ? val.toString() : "";
}

const NUM_FIELDS: (keyof Settings)[] = [
  "incomeGoal", "bankBalance", "homeValue", "homeAppreciation",
  "mortgageBalance", "mortgageRate", "mortgagePayment",
  "studentLoanBalance", "studentLoanRate", "studentLoanPayment", "studentLoanPaymentDay",
  "carLoanBalance", "carLoanRate", "carLoanPayment", "carLoanPaymentDay",
  "investmentGrowthRate", "stateTaxRate", "municipalTaxRate", "mileageRate",
  "additionalW2Income", "rentalIncome",
];

export default function SettingsPage() {
  const { canEdit, isProUser } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [savedDescriptions, setSavedDescriptions] = useState<Record<string, string[]>>({});
  const [newDesc, setNewDesc] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const f: Record<string, string> = {};
        for (const key of NUM_FIELDS) {
          f[key] = numToForm(data[key] ?? 0);
        }
        f.refDate = data.refDate ? new Date(data.refDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
        f.filingStatus = data.filingStatus || "SINGLE";
        f.state = data.state || "OH";
        setFields(f);
        if (data.savedDescriptions) setSavedDescriptions(data.savedDescriptions);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    // Convert string fields to numbers for the API
    const payload: Record<string, unknown> = {
      refDate: fields.refDate,
      filingStatus: fields.filingStatus,
      state: fields.state,
      savedDescriptions: Object.keys(savedDescriptions).length > 0 ? savedDescriptions : null,
    };
    for (const key of NUM_FIELDS) {
      payload[key] = fields[key] === "" ? 0 : parseFloat(fields[key]) || 0;
    }
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="text-slate-500 py-8">Loading settings...</div>;
  }

  const update = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
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
        {/* Appearance */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200">Dark Mode</p>
              <p className="text-xs text-slate-500">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === "dark" ? "bg-emerald-600" : "bg-slate-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === "dark" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Income Goal */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Income Goal</h3>
          <Field
            label="Annual Income Goal"
            value={fields.incomeGoal}
            onChange={(v) => update("incomeGoal", v)}
            prefix="$"
            step="1000"
            hint="Shown in the progress bar at the top of the page"
          />
        </div>

        {/* Tax Configuration */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Tax Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Filing Status</label>
              <select
                value={fields.filingStatus}
                onChange={(e) => update("filingStatus", e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-900 text-slate-100"
              >
                {FILING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Determines federal tax brackets and standard deduction</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">State</label>
              <select
                value={fields.state}
                onChange={(e) => update("state", e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-900 text-slate-100"
              >
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <Field
              label="State Tax Rate"
              value={fields.stateTaxRate}
              onChange={(v) => update("stateTaxRate", v)}
              hint="e.g. 0.035 for 3.5%"
              step="0.001"
            />
            <Field
              label="Municipal/Local Tax Rate"
              value={fields.municipalTaxRate}
              onChange={(v) => update("municipalTaxRate", v)}
              hint="City or county income tax rate (e.g. 0.02 for 2%)"
              step="0.001"
            />
            <Field
              label="IRS Mileage Rate"
              value={fields.mileageRate}
              onChange={(v) => update("mileageRate", v)}
              prefix="$"
              suffix="/mi"
              hint="Standard mileage deduction rate (2025: $0.70/mi)"
              step="0.01"
            />
          </div>
        </div>

        {/* Additional Income */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-1">Additional Income</h3>
          <p className="text-xs text-slate-500 mb-4">Other income sources that affect your tax bracket (not tracked weekly)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Annual W-2 Income"
              value={fields.additionalW2Income}
              onChange={(v) => update("additionalW2Income", v)}
              prefix="$"
              step="1000"
              hint="Spouse or other W-2 employment income"
            />
            <Field
              label="Annual Rental Income"
              value={fields.rentalIncome}
              onChange={(v) => update("rentalIncome", v)}
              prefix="$"
              step="1000"
              hint="Net rental income from investment properties"
            />
          </div>
        </div>

        {/* Reference Date & Bank Balance */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Bank Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Reference Date</label>
              <input
                type="date"
                value={fields.refDate}
                onChange={(e) => update("refDate", e.target.value)}
                className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-900 text-slate-100 placeholder-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">The date your starting balances are from</p>
            </div>
            <Field
              label="Starting Bank Balance"
              value={fields.bankBalance}
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
            <Field label="Balance" value={fields.studentLoanBalance} onChange={(v) => update("studentLoanBalance", v)} prefix="$" />
            <Field label="Interest Rate" value={fields.studentLoanRate} onChange={(v) => update("studentLoanRate", v)} hint="e.g. 0.075 for 7.5%" step="0.001" />
            <Field label="Monthly Payment" value={fields.studentLoanPayment} onChange={(v) => update("studentLoanPayment", v)} prefix="$" suffix="/mo" />
            <Field label="Payment Day of Month" value={fields.studentLoanPaymentDay} onChange={(v) => update("studentLoanPaymentDay", v)} hint="1-31" step="1" />
          </div>
        </div>

        {/* Car Loan */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Car Loan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Balance" value={fields.carLoanBalance} onChange={(v) => update("carLoanBalance", v)} prefix="$" />
            <Field label="Interest Rate" value={fields.carLoanRate} onChange={(v) => update("carLoanRate", v)} hint="e.g. 0.04 for 4%" step="0.001" />
            <Field label="Monthly Payment" value={fields.carLoanPayment} onChange={(v) => update("carLoanPayment", v)} prefix="$" suffix="/mo" />
            <Field label="Payment Day of Month" value={fields.carLoanPaymentDay} onChange={(v) => update("carLoanPaymentDay", v)} hint="1-31" step="1" />
          </div>
        </div>
        {/* Investment Assumptions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-4">Investment Assumptions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Annual Growth Rate"
              value={fields.investmentGrowthRate}
              onChange={(v) => update("investmentGrowthRate", v)}
              hint="Used for manual investment projections (e.g. 0.07 for 7%)"
              step="0.01"
            />
          </div>
        </div>

        {/* Saved Descriptions */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold text-slate-200 mb-1">Quick-Add Descriptions</h3>
          <p className="text-xs text-slate-500 mb-4">
            Save common descriptions for each category. These appear as quick-add chips in your weekly entry form.
          </p>
          {[
            { key: "INCOME", label: "Income", color: "bg-emerald-900/30 border-emerald-700 text-emerald-400" },
            { key: "BUSINESS_EXPENSE", label: "Business Expenses", color: "bg-red-900/30 border-red-700 text-red-400" },
            { key: "PERSONAL_EXPENSE", label: "Personal Expenses", color: "bg-orange-900/30 border-orange-700 text-orange-400" },
            { key: "OWNER_DRAW", label: "Owner Draws", color: "bg-blue-900/30 border-blue-700 text-blue-400" },
          ].map(({ key, label, color }) => (
            <div key={key} className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(savedDescriptions[key] || []).map((desc) => (
                  <span key={desc} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${color}`}>
                    {desc}
                    <button
                      type="button"
                      onClick={() => {
                        setSavedDescriptions((prev) => ({
                          ...prev,
                          [key]: (prev[key] || []).filter((d) => d !== desc),
                        }));
                      }}
                      className="hover:opacity-70 ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Add ${label.toLowerCase()} description...`}
                  value={newDesc[key] || ""}
                  onChange={(e) => setNewDesc((prev) => ({ ...prev, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (newDesc[key] || "").trim();
                      if (val && !(savedDescriptions[key] || []).includes(val)) {
                        setSavedDescriptions((prev) => ({
                          ...prev,
                          [key]: [...(prev[key] || []), val],
                        }));
                        setNewDesc((prev) => ({ ...prev, [key]: "" }));
                      }
                    }
                  }}
                  className="flex-1 border border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = (newDesc[key] || "").trim();
                    if (val && !(savedDescriptions[key] || []).includes(val)) {
                      setSavedDescriptions((prev) => ({
                        ...prev,
                        [key]: [...(prev[key] || []), val],
                      }));
                      setNewDesc((prev) => ({ ...prev, [key]: "" }));
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          ))}
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
