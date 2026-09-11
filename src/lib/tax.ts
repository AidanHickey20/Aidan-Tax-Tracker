import {
  SE_TAX_BASE_RATE,
  SS_RATE,
  MEDICARE_RATE,
  SS_WAGE_BASE,
  QBI_DEDUCTION_RATE,
  STANDARD_DEDUCTIONS,
  FEDERAL_BRACKETS_BY_STATUS,
} from "@/lib/tax-constants";

// The subset of user settings that affect the tax estimate.
export interface TaxSettings {
  filingStatus?: string;
  stateTaxRate?: number;
  municipalTaxRate?: number;
  additionalW2Income?: number;
  rentalIncome?: number;
}

function federalTax(taxableIncome: number, brackets: { limit: number; rate: number }[]): number {
  let tax = 0;
  let remaining = taxableIncome;
  let prevLimit = 0;
  for (const b of brackets) {
    const span = b.limit - prevLimit;
    const taxable = Math.min(remaining, span);
    tax += taxable * b.rate;
    remaining -= taxable;
    prevLimit = b.limit;
    if (remaining <= 0) break;
  }
  return tax;
}

/**
 * Estimate the total tax liability for a self-employed real-estate professional:
 * SE tax + incremental federal income tax + state + municipal tax on the
 * self-employment income. W-2 and rental income shift which federal brackets the
 * SE income lands in, but their own tax is assumed withheld/paid separately, so
 * it's subtracted back out.
 */
export function estimateTax(netSEIncome: number, settings?: TaxSettings | null): number {
  if (netSEIncome <= 0 && !settings?.additionalW2Income && !settings?.rentalIncome) return 0;

  const filingStatus = settings?.filingStatus || "SINGLE";
  const userStateTaxRate = settings?.stateTaxRate ?? 0.035;
  const userMunicipalTaxRate = settings?.municipalTaxRate ?? 0.02;
  const w2Income = settings?.additionalW2Income ?? 0;
  const rentalIncome = settings?.rentalIncome ?? 0;

  // SE tax only applies to self-employment income.
  const seBase = Math.max(netSEIncome, 0) * SE_TAX_BASE_RATE;
  const ssTax = Math.min(seBase, SS_WAGE_BASE) * SS_RATE;
  const medicareTax = seBase * MEDICARE_RATE;
  const seTax = ssTax + medicareTax;

  const standardDeduction = STANDARD_DEDUCTIONS[filingStatus] ?? STANDARD_DEDUCTIONS.SINGLE;
  const brackets = FEDERAL_BRACKETS_BY_STATUS[filingStatus] ?? FEDERAL_BRACKETS_BY_STATUS.SINGLE;

  // AGI includes all income sources.
  const seAgi = Math.max(netSEIncome, 0) - seTax / 2;
  const qbiDeduction = Math.max(netSEIncome, 0) * QBI_DEDUCTION_RATE;
  const totalAgi = seAgi + w2Income + rentalIncome;
  const taxableIncome = Math.max(totalAgi - standardDeduction - qbiDeduction, 0);

  const totalFedTax = federalTax(taxableIncome, brackets);

  // Subtract the federal tax owed on the W-2/rental income alone (paid separately).
  const otherIncome = w2Income + rentalIncome;
  const otherTaxableIncome = Math.max(otherIncome - standardDeduction, 0);
  const otherFedTax = otherIncome > 0 ? federalTax(otherTaxableIncome, brackets) : 0;

  // The incremental federal tax attributable to SE income.
  const fedTax = totalFedTax - otherFedTax;

  // State/local tax on SE income only.
  const seTaxableIncome = Math.max(seAgi - qbiDeduction, 0);
  const stateTax = seTaxableIncome * userStateTaxRate;
  const municipalTax = Math.max(netSEIncome, 0) * userMunicipalTaxRate;

  return seTax + fedTax + stateTax + municipalTax;
}
