"use client";

import { useState, useRef } from "react";
import { formatCurrency } from "@/lib/utils";

interface ParsedRow {
  [key: string]: string | number | null;
}

interface SheetData {
  name: string;
  headers: string[];
  rows: ParsedRow[];
}

type FieldMapping =
  | "ignore"
  | "weekStart"
  | "weekEnd"
  | "income"
  | "incomeDescription"
  | "businessExpense"
  | "businessExpenseDescription"
  | "personalExpense"
  | "personalExpenseDescription"
  | "ownerDraw"
  | "ownerDrawDescription"
  | "mileage"
  | "notes"
  | "accountName"
  | "accountBalance"
  | "investmentName"
  | "investmentAmount";

const FIELD_OPTIONS: { value: FieldMapping; label: string; group: string }[] = [
  { value: "ignore", label: "-- Skip this column --", group: "" },
  { value: "weekStart", label: "Week Start Date", group: "Dates" },
  { value: "weekEnd", label: "Week End Date", group: "Dates" },
  { value: "income", label: "Income Amount", group: "Income" },
  { value: "incomeDescription", label: "Income Description", group: "Income" },
  { value: "businessExpense", label: "Business Expense Amount", group: "Business Expenses" },
  { value: "businessExpenseDescription", label: "Business Expense Description", group: "Business Expenses" },
  { value: "personalExpense", label: "Personal Expense Amount", group: "Personal Expenses" },
  { value: "personalExpenseDescription", label: "Personal Expense Description", group: "Personal Expenses" },
  { value: "ownerDraw", label: "Owner Draw Amount", group: "Owner Draws" },
  { value: "ownerDrawDescription", label: "Owner Draw Description", group: "Owner Draws" },
  { value: "mileage", label: "Mileage", group: "Other" },
  { value: "notes", label: "Notes", group: "Other" },
  { value: "accountName", label: "Account Name", group: "Accounts" },
  { value: "accountBalance", label: "Account Balance", group: "Accounts" },
  { value: "investmentName", label: "Investment Name", group: "Investments" },
  { value: "investmentAmount", label: "Investment Amount", group: "Investments" },
];

function guessMapping(header: string): FieldMapping {
  const h = header.toLowerCase().trim();

  if (h.includes("week") && h.includes("start") || h === "start date" || h === "week start") return "weekStart";
  if (h.includes("week") && h.includes("end") || h === "end date" || h === "week end") return "weekEnd";
  if (h === "date" || h === "week" || h === "period") return "weekStart";

  if ((h.includes("income") || h.includes("revenue") || h.includes("earnings")) && (h.includes("desc") || h.includes("name") || h.includes("source"))) return "incomeDescription";
  if (h.includes("income") || h.includes("revenue") || h.includes("earnings")) return "income";

  if ((h.includes("business") || h.includes("biz")) && h.includes("desc")) return "businessExpenseDescription";
  if (h.includes("business") && (h.includes("expense") || h.includes("cost"))) return "businessExpense";

  if (h.includes("personal") && h.includes("desc")) return "personalExpenseDescription";
  if (h.includes("personal") && (h.includes("expense") || h.includes("cost"))) return "personalExpense";

  if ((h.includes("draw") || h.includes("transfer") || h.includes("owner")) && h.includes("desc")) return "ownerDrawDescription";
  if (h.includes("draw") || (h.includes("owner") && h.includes("transfer"))) return "ownerDraw";

  if (h.includes("mile") || h.includes("mileage") || h.includes("driving")) return "mileage";
  if (h.includes("note") || h.includes("memo") || h.includes("comment")) return "notes";

  if (h.includes("account") && (h.includes("name") || h.includes("type"))) return "accountName";
  if (h.includes("account") && h.includes("bal")) return "accountBalance";
  if (h.includes("balance") && !h.includes("invest")) return "accountBalance";

  if (h.includes("invest") && (h.includes("name") || h.includes("desc"))) return "investmentName";
  if (h.includes("invest") && (h.includes("amount") || h.includes("val"))) return "investmentAmount";

  if (h === "expense" || h === "expenses" || h === "cost" || h === "costs") return "businessExpense";
  if (h === "description" || h === "desc" || h === "item") return "incomeDescription";
  if (h === "amount" || h === "total" || h === "value") return "income";

  return "ignore";
}

interface ImportEntry {
  weekStart: string;
  weekEnd: string;
  mileage: number;
  notes: string;
  lineItems: { description: string; amount: number; category: string }[];
  accountBalances: { accountName: string; balance: number }[];
  investments: { name: string; amount: number }[];
}

function buildEntries(
  rows: ParsedRow[],
  headers: string[],
  mappings: Record<string, FieldMapping>
): ImportEntry[] {
  // Group rows by week start date
  const weekMap = new Map<string, ImportEntry>();

  for (const row of rows) {
    // Find week start
    let weekStartRaw: string | null = null;
    let weekEndRaw: string | null = null;

    for (const h of headers) {
      const mapping = mappings[h];
      const val = row[h];
      if (mapping === "weekStart" && val != null) {
        weekStartRaw = normalizeDate(val);
      }
      if (mapping === "weekEnd" && val != null) {
        weekEndRaw = normalizeDate(val);
      }
    }

    if (!weekStartRaw) continue; // skip rows without a date

    // Default weekEnd to 6 days after weekStart
    if (!weekEndRaw) {
      const startDate = new Date(weekStartRaw);
      const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
      weekEndRaw = endDate.toISOString().split("T")[0];
    }

    const key = weekStartRaw;
    if (!weekMap.has(key)) {
      weekMap.set(key, {
        weekStart: weekStartRaw,
        weekEnd: weekEndRaw,
        mileage: 0,
        notes: "",
        lineItems: [],
        accountBalances: [],
        investments: [],
      });
    }

    const entry = weekMap.get(key)!;

    // Process each mapped column
    let incomeDesc = "";
    let bizExpDesc = "";
    let persExpDesc = "";
    let drawDesc = "";
    let acctName = "";
    let investName = "";

    // First pass: get descriptions
    for (const h of headers) {
      const val = row[h];
      if (val == null) continue;
      const mapping = mappings[h];
      if (mapping === "incomeDescription") incomeDesc = String(val);
      if (mapping === "businessExpenseDescription") bizExpDesc = String(val);
      if (mapping === "personalExpenseDescription") persExpDesc = String(val);
      if (mapping === "ownerDrawDescription") drawDesc = String(val);
      if (mapping === "accountName") acctName = String(val);
      if (mapping === "investmentName") investName = String(val);
    }

    // Second pass: get amounts
    for (const h of headers) {
      const val = row[h];
      if (val == null) continue;
      const mapping = mappings[h];
      const numVal = typeof val === "number" ? val : parseFloat(String(val).replace(/[$,]/g, ""));

      switch (mapping) {
        case "income":
          if (!isNaN(numVal) && numVal !== 0) {
            entry.lineItems.push({
              description: incomeDesc || h,
              amount: Math.abs(numVal),
              category: "INCOME",
            });
          }
          break;
        case "businessExpense":
          if (!isNaN(numVal) && numVal !== 0) {
            entry.lineItems.push({
              description: bizExpDesc || h,
              amount: Math.abs(numVal),
              category: "BUSINESS_EXPENSE",
            });
          }
          break;
        case "personalExpense":
          if (!isNaN(numVal) && numVal !== 0) {
            entry.lineItems.push({
              description: persExpDesc || h,
              amount: Math.abs(numVal),
              category: "PERSONAL_EXPENSE",
            });
          }
          break;
        case "ownerDraw":
          if (!isNaN(numVal) && numVal !== 0) {
            entry.lineItems.push({
              description: drawDesc || h,
              amount: Math.abs(numVal),
              category: "OWNER_DRAW",
            });
          }
          break;
        case "mileage":
          if (!isNaN(numVal)) entry.mileage += numVal;
          break;
        case "notes":
          if (entry.notes) entry.notes += "; ";
          entry.notes += String(val);
          break;
        case "accountBalance":
          if (!isNaN(numVal) && acctName) {
            const existing = entry.accountBalances.find((b) => b.accountName === acctName);
            if (existing) {
              existing.balance = numVal;
            } else {
              entry.accountBalances.push({ accountName: acctName, balance: numVal });
            }
          }
          break;
        case "investmentAmount":
          if (!isNaN(numVal) && investName) {
            entry.investments.push({ name: investName, amount: numVal });
          }
          break;
      }
    }
  }

  return Array.from(weekMap.values()).sort(
    (a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );
}

function normalizeDate(val: string | number | Date | null): string {
  if (val == null) return "";
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return "";
}

export default function SpreadsheetImport({ onImported }: { onImported: () => void }) {
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [mappings, setMappings] = useState<Record<string, FieldMapping>>({});
  const [previewEntries, setPreviewEntries] = useState<ImportEntry[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/import/parse", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      setError("Failed to parse file. Make sure it is a valid .xlsx, .xls, or .csv file.");
      return;
    }

    const data = await res.json();
    if (!data.sheets || data.sheets.length === 0) {
      setError("No data found in the file.");
      return;
    }

    setSheets(data.sheets);
    setSelectedSheet(0);

    // Auto-guess mappings
    const sheet = data.sheets[0];
    const guessed: Record<string, FieldMapping> = {};
    for (const h of sheet.headers) {
      guessed[h] = guessMapping(h);
    }
    setMappings(guessed);
    setStep("map");
  }

  function handleSheetChange(index: number) {
    setSelectedSheet(index);
    const sheet = sheets[index];
    const guessed: Record<string, FieldMapping> = {};
    for (const h of sheet.headers) {
      guessed[h] = guessMapping(h);
    }
    setMappings(guessed);
  }

  function handleMapping(header: string, value: FieldMapping) {
    setMappings({ ...mappings, [header]: value });
  }

  function handlePreview() {
    const sheet = sheets[selectedSheet];
    const entries = buildEntries(sheet.rows, sheet.headers, mappings);
    setPreviewEntries(entries);
    setStep("preview");
  }

  async function handleImport() {
    setImporting(true);
    const res = await fetch("/api/import/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries: previewEntries }),
    });
    const data = await res.json();
    setImporting(false);
    setImportResult(`Successfully imported ${data.imported} week(s).`);
    setStep("done");
    onImported();
  }

  function reset() {
    setStep("upload");
    setSheets([]);
    setMappings({});
    setPreviewEntries([]);
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const sheet = sheets[selectedSheet];

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-sm mb-6">
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-200">Import from Spreadsheet</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a .xlsx, .xls, or .csv file to import weekly entries
          </p>
        </div>
        {step !== "upload" && (
          <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-200">
            Start Over
          </button>
        )}
      </div>

      <div className="px-5 py-4">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div>
            {error && (
              <div className="mb-4 bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-600 rounded-lg py-10 px-6 cursor-pointer hover:border-emerald-400 hover:bg-emerald-900/30 transition-colors">
              <svg className="w-10 h-10 text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium text-slate-300 mb-1">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-slate-500">
                .xlsx, .xls, or .csv
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === "map" && sheet && (
          <div>
            {/* Sheet selector */}
            {sheets.length > 1 && (
              <div className="mb-4">
                <label className="text-xs text-slate-400 block mb-1">Select Sheet</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(Number(e.target.value))}
                  className="border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500"
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name} ({s.rows.length} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-sm text-slate-300 mb-4">
              Found <strong>{sheet.rows.length}</strong> rows in &quot;{sheet.name}&quot;.
              Map each column to the right field:
            </p>

            <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
              {sheet.headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="w-48 text-sm font-medium text-slate-200 truncate" title={h}>
                    {h}
                  </div>
                  <span className="text-slate-600">&#8594;</span>
                  <select
                    value={mappings[h] || "ignore"}
                    onChange={(e) => handleMapping(h, e.target.value as FieldMapping)}
                    className={`flex-1 border rounded-lg px-3 py-1.5 text-sm ${
                      mappings[h] === "ignore" ? "border-slate-700 text-slate-500 bg-slate-900" : "border-emerald-700 text-emerald-400 bg-emerald-900/30"
                    }`}
                  >
                    {FIELD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500 w-24 truncate" title={String(sheet.rows[0]?.[h] ?? "")}>
                    e.g. {String(sheet.rows[0]?.[h] ?? "—")}
                  </span>
                </div>
              ))}
            </div>

            {/* Sample data table */}
            <details className="mb-4">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-200">
                Preview raw data (first 5 rows)
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="text-xs border border-slate-700 w-full">
                  <thead>
                    <tr>
                      {sheet.headers.map((h) => (
                        <th key={h} className="border border-slate-700 px-2 py-1 bg-slate-900 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {sheet.headers.map((h) => (
                          <td key={h} className="border border-slate-700 px-2 py-1 text-slate-300">
                            {row[h] != null ? String(row[h]) : ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <button
              onClick={handlePreview}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Preview Import
            </button>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div>
            <p className="text-sm text-slate-300 mb-4">
              Ready to import <strong>{previewEntries.length}</strong> week(s).
              Review the data below:
            </p>

            {previewEntries.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No entries could be built from the data. Make sure you mapped a &quot;Week Start Date&quot; column and at least one amount column.
                <div className="mt-3">
                  <button
                    onClick={() => setStep("map")}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    Go back and adjust mappings
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {previewEntries.map((entry, i) => {
                    const income = entry.lineItems
                      .filter((li) => li.category === "INCOME")
                      .reduce((s, li) => s + li.amount, 0);
                    const expenses = entry.lineItems
                      .filter((li) => li.category === "BUSINESS_EXPENSE")
                      .reduce((s, li) => s + li.amount, 0);

                    return (
                      <div key={i} className="border border-slate-700 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-200">
                            {entry.weekStart} to {entry.weekEnd}
                          </span>
                          <div className="flex gap-3 text-xs">
                            <span className="text-emerald-600">
                              Income: {formatCurrency(income)}
                            </span>
                            <span className="text-red-500">
                              Biz Exp: {formatCurrency(expenses)}
                            </span>
                            {entry.mileage > 0 && (
                              <span className="text-purple-500">{entry.mileage} mi</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 space-y-0.5">
                          {entry.lineItems.map((li, j) => (
                            <div key={j}>
                              <span className="text-slate-500">[{li.category.replace(/_/g, " ")}]</span>{" "}
                              {li.description}: {formatCurrency(li.amount)}
                            </div>
                          ))}
                          {entry.accountBalances.map((b, j) => (
                            <div key={`b-${j}`}>
                              <span className="text-slate-500">[ACCOUNT]</span>{" "}
                              {b.accountName}: {formatCurrency(b.balance)}
                            </div>
                          ))}
                          {entry.investments.map((inv, j) => (
                            <div key={`inv-${j}`}>
                              <span className="text-slate-500">[INVESTMENT]</span>{" "}
                              {inv.name}: {formatCurrency(inv.amount)}
                            </div>
                          ))}
                          {entry.notes && (
                            <div>
                              <span className="text-slate-500">[NOTES]</span> {entry.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-400"
                  >
                    {importing ? "Importing..." : `Import ${previewEntries.length} Week(s)`}
                  </button>
                  <button
                    onClick={() => setStep("map")}
                    className="text-slate-400 hover:text-slate-200 px-4 py-2 text-sm"
                  >
                    Back to Mapping
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="text-center py-6">
            <div className="text-emerald-600 text-lg font-semibold mb-2">{importResult}</div>
            <button
              onClick={reset}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Import Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
