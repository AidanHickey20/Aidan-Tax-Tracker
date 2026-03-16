// Self-employment tax constants
export const SE_TAX_BASE_RATE = 0.9235;
export const SS_RATE = 0.124;
export const MEDICARE_RATE = 0.029;
export const SS_WAGE_BASE = 176100;

// Deductions
export const STANDARD_DEDUCTION = 15700;
export const QBI_DEDUCTION_RATE = 0.20;

// Federal income tax brackets (2024 single filer)
export const FEDERAL_BRACKETS = [
  { limit: 11925, rate: 0.10 },
  { limit: 48475, rate: 0.12 },
  { limit: 103350, rate: 0.22 },
  { limit: 197300, rate: 0.24 },
  { limit: 250525, rate: 0.32 },
  { limit: 626350, rate: 0.35 },
  { limit: Infinity, rate: 0.37 },
];

// State and local tax rates (placeholder — will become user-configurable)
export const STATE_TAX_RATE = 0.035;
export const MUNICIPAL_TAX_RATE = 0.02;
