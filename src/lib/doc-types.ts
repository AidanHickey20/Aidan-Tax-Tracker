// Client-safe document-type constants (no server-only imports). Shared by the
// UI and the server classifier in src/lib/documents.ts.

export const DOC_TYPES = [
  "SETTLEMENT_STATEMENT",
  "W9",
  "W2",
  "FORM_1099",
  "CONTRACT",
  "RECEIPT",
  "INSURANCE",
  "BANK_STATEMENT",
  "PROPERTY",
  "TAX",
  "OTHER",
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  SETTLEMENT_STATEMENT: "Settlement Statements",
  W9: "W-9s",
  W2: "W-2s",
  FORM_1099: "1099s",
  CONTRACT: "Contracts & Agreements",
  RECEIPT: "Receipts & Invoices",
  INSURANCE: "Insurance",
  BANK_STATEMENT: "Bank Statements",
  PROPERTY: "Property Documents",
  TAX: "Tax Documents",
  OTHER: "Other",
};

export function isDocType(v: string): v is DocType {
  return (DOC_TYPES as readonly string[]).includes(v);
}
