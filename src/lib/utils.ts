import { startOfWeek, endOfWeek, format, startOfYear, endOfYear } from "date-fns";

export function getCurrentWeekRange() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  return { start, end };
}

export function getCurrentYearRange() {
  const now = new Date();
  return {
    start: startOfYear(now),
    end: endOfYear(now),
  };
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatWeekLabel(start: Date | string, end: Date | string) {
  return `${format(new Date(start), "MMM d")} - ${format(new Date(end), "MMM d, yyyy")}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export const CATEGORIES = {
  INCOME: "Income",
  BUSINESS_EXPENSE: "Business Expense",
  PERSONAL_EXPENSE: "Personal Expense",
  OWNER_DRAW: "Owner Draw",
  INVESTMENT: "Investment",
} as const;

export type Category = keyof typeof CATEGORIES;
