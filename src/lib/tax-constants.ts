// Self-employment tax constants
export const SE_TAX_BASE_RATE = 0.9235;
export const SS_RATE = 0.124;
export const MEDICARE_RATE = 0.029;
export const SS_WAGE_BASE = 176100;

// Deductions
export const QBI_DEDUCTION_RATE = 0.20;

// Standard deductions by filing status (2025)
export const STANDARD_DEDUCTIONS: Record<string, number> = {
  SINGLE: 15700,
  MARRIED_JOINT: 31400,
  MARRIED_SEPARATE: 15700,
  HEAD_OF_HOUSEHOLD: 23500,
};

// Federal income tax brackets by filing status (2025)
export const FEDERAL_BRACKETS_BY_STATUS: Record<string, { limit: number; rate: number }[]> = {
  SINGLE: [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  MARRIED_JOINT: [
    { limit: 23850, rate: 0.10 },
    { limit: 96950, rate: 0.12 },
    { limit: 206700, rate: 0.22 },
    { limit: 394600, rate: 0.24 },
    { limit: 501050, rate: 0.32 },
    { limit: 751600, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  MARRIED_SEPARATE: [
    { limit: 11925, rate: 0.10 },
    { limit: 48475, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250525, rate: 0.32 },
    { limit: 375800, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
  HEAD_OF_HOUSEHOLD: [
    { limit: 17000, rate: 0.10 },
    { limit: 64850, rate: 0.12 },
    { limit: 103350, rate: 0.22 },
    { limit: 197300, rate: 0.24 },
    { limit: 250500, rate: 0.32 },
    { limit: 626350, rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ],
};

// Backwards-compatible exports for any code still using the old names
export const STANDARD_DEDUCTION = STANDARD_DEDUCTIONS.SINGLE;
export const FEDERAL_BRACKETS = FEDERAL_BRACKETS_BY_STATUS.SINGLE;

// Default state and local tax rates (user-configurable via settings)
export const STATE_TAX_RATE = 0.035;
export const MUNICIPAL_TAX_RATE = 0.02;
