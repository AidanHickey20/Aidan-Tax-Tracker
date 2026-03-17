import { z } from "zod";

// ── Shared sub-schemas ──

const lineItemSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number(),
  category: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_EXPENSE", "OWNER_DRAW"]),
});

const accountBalanceSchema = z.object({
  accountName: z.string().min(1).max(200),
  balance: z.number(),
});

const investmentEntrySchema = z.object({
  name: z.string().min(1).max(200),
  amount: z.number(),
});

// ── Weekly Entries ──

export const createEntrySchema = z.object({
  weekStart: z.string().min(1),
  weekEnd: z.string().min(1),
  mileage: z.number().min(0).optional().default(0),
  notes: z.string().max(5000).optional().default(""),
  lineItems: z.array(lineItemSchema).optional().default([]),
  accountBalances: z.array(accountBalanceSchema).optional().default([]),
  investments: z.array(investmentEntrySchema).optional().default([]),
});

export const updateEntrySchema = createEntrySchema;

export const importEntriesSchema = z.object({
  entries: z.array(z.object({
    weekStart: z.string().min(1),
    weekEnd: z.string().min(1),
    mileage: z.number().min(0).optional().default(0),
    notes: z.string().max(5000).optional().default(""),
    lineItems: z.array(lineItemSchema).optional().default([]),
    accountBalances: z.array(accountBalanceSchema).optional().default([]),
    investments: z.array(investmentEntrySchema).optional().default([]),
  })).min(1),
});

// ── Settings ──

export const updateSettingsSchema = z.object({
  incomeGoal: z.number().optional().default(0),
  bankBalance: z.number().optional().default(0),
  homeValue: z.number().min(0).optional().default(0),
  homeAppreciation: z.number().optional().default(0),
  mortgageBalance: z.number().min(0).optional().default(0),
  mortgageRate: z.number().min(0).optional().default(0),
  mortgagePayment: z.number().min(0).optional().default(0),
  studentLoanBalance: z.number().min(0).optional().default(0),
  studentLoanRate: z.number().min(0).optional().default(0),
  studentLoanPayment: z.number().min(0).optional().default(0),
  studentLoanPaymentDay: z.number().int().min(1).max(31).optional().default(1),
  carLoanBalance: z.number().min(0).optional().default(0),
  carLoanRate: z.number().min(0).optional().default(0),
  carLoanPayment: z.number().min(0).optional().default(0),
  carLoanPaymentDay: z.number().int().min(1).max(31).optional().default(16),
  investmentGrowthRate: z.number().min(0).max(1).optional().default(0.07),
  refDate: z.string().optional(),
});

// ── Portfolio ──

export const createInvestmentSchema = z.object({
  symbol: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  shares: z.number().min(0).optional().default(0),
  avgCost: z.number().min(0).optional().default(0),
  recurringAmount: z.number().min(0).optional().default(0),
  recurringDay: z.number().int().min(-1).max(6).optional().default(-1),
});

export const updateInvestmentSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  shares: z.number().min(0),
  avgCost: z.number().min(0),
  recurringAmount: z.number().min(0).optional().default(0),
  recurringDay: z.number().int().min(-1).max(6).optional().default(-1),
});

export const deleteByIdSchema = z.object({
  id: z.string().min(1),
});

// ── Properties ──

export const createPropertySchema = z.object({
  address: z.string().min(1).max(500),
  nickname: z.string().max(200).optional().default(""),
  purchasePrice: z.number().min(0).optional().default(0),
  currentValue: z.number().min(0).optional().default(0),
  appreciationRate: z.number().min(0).max(1).optional().default(0.03),
  mortgageBalance: z.number().min(0).optional().default(0),
  mortgageRate: z.number().min(0).max(1).optional().default(0),
  mortgagePayment: z.number().min(0).optional().default(0),
  mortgageTerm: z.number().int().min(0).optional().default(360),
  startDate: z.string().optional(),
});

export const updatePropertySchema = z.object({
  id: z.string().min(1),
  address: z.string().min(1).max(500),
  nickname: z.string().max(200),
  purchasePrice: z.number().min(0),
  currentValue: z.number().min(0),
  appreciationRate: z.number().min(0).max(1),
  mortgageBalance: z.number().min(0),
  mortgageRate: z.number().min(0).max(1),
  mortgagePayment: z.number().min(0),
  mortgageTerm: z.number().int().min(0),
  startDate: z.string().optional(),
});

// ── Deals ──

export const createDealSchema = z.object({
  address: z.string().min(1).max(500),
  nickname: z.string().max(200).optional().default(""),
  purchasePrice: z.number().min(0).optional().default(0),
  arv: z.number().min(0).optional().default(0),
  insurance: z.number().min(0).optional().default(0),
  notes: z.string().max(5000).optional().default(""),
});

export const updateDealSchema = z.object({
  id: z.string().min(1),
  address: z.string().min(1).max(500),
  nickname: z.string().max(200),
  purchasePrice: z.number().min(0),
  arv: z.number().min(0),
  status: z.string().min(1),
  notes: z.string().max(5000),
  closedAt: z.string().nullable().optional(),
});

export const createDealExpenseSchema = z.object({
  dealId: z.string().min(1),
  description: z.string().min(1).max(500),
  amount: z.number(),
  category: z.string().min(1),
  paidAt: z.string().optional(),
});

export const updateDealStepSchema = z.object({
  id: z.string().min(1),
  completed: z.boolean(),
  notes: z.string().max(5000).optional(),
});

// ── Recurring Items ──

export const createRecurringSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number(),
  category: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_EXPENSE", "OWNER_DRAW", "INVESTMENT"]),
  frequency: z.enum(["WEEKLY", "MONTHLY"]).optional().default("WEEKLY"),
  scheduledDay: z.number().int().min(-1).max(31).optional().default(-1),
  isActive: z.boolean().optional().default(true),
});

export const updateRecurringSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(500),
  amount: z.number(),
  category: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_EXPENSE", "OWNER_DRAW", "INVESTMENT"]),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
  scheduledDay: z.number().int().min(-1).max(31),
  isActive: z.boolean(),
});

// ── Reminders ──

export const createReminderSchema = z.object({
  message: z.string().min(1).max(500),
  frequency: z.enum(["WEEKLY", "MONTHLY"]).optional().default("WEEKLY"),
  scheduledDay: z.number().int().min(-1).max(31).optional().default(-1),
  isActive: z.boolean().optional().default(true),
});

export const updateReminderSchema = z.object({
  id: z.string().min(1),
  message: z.string().min(1).max(500),
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
  scheduledDay: z.number().int().min(-1).max(31),
  isActive: z.boolean(),
});

// ── Tax Advisor ──

export const taxAdvisorSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(10000),
  })).min(1).max(50),
});

// ── User Accounts ──

export const createUserAccountSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["CASH", "INVESTMENT", "CRYPTO", "RETIREMENT"]),
  group: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateUserAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200).optional(),
  category: z.enum(["CASH", "INVESTMENT", "CRYPTO", "RETIREMENT"]).optional(),
  group: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// ── Registration ──

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

// ── Validate helper ──

export function validate<T>(schema: z.ZodSchema<T>, data: unknown):
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: result.error.issues.map((i) => i.message).join(", ") };
  }
  return { success: true, data: result.data };
}
