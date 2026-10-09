import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { getCurrentYearRange } from "@/lib/utils";
import { estimateTax } from "@/lib/tax";
import { ensureDefaultBusiness } from "@/lib/business";
import { logError } from "@/lib/logger";

// Returns each business's YTD taxable profit + estimated tax, plus the combined
// totals across all businesses — so the dashboard can show both per-business and
// an overall number. Mirrors the dashboard's math: taxable = YTD submitted
// INCOME minus BUSINESS_EXPENSE, taxed with that business's own settings.
export async function GET() {
  try {
    const userId = await requireUserId();
    await ensureDefaultBusiness(userId); // adopt any orphan rows before aggregating

    const { start, end } = getCurrentYearRange();
    const [businesses, entries] = await Promise.all([
      prisma.business.findMany({
        where: { userId },
        orderBy: { sortOrder: "asc" },
        include: { settings: true },
      }),
      prisma.weeklyEntry.findMany({
        where: { userId, status: "SUBMITTED", weekStart: { gte: start }, weekEnd: { lte: end } },
        include: { lineItems: true },
      }),
    ]);

    const byBiz = new Map<string, { income: number; expenses: number }>();
    for (const e of entries) {
      if (!e.businessId) continue;
      const agg = byBiz.get(e.businessId) ?? { income: 0, expenses: 0 };
      for (const li of e.lineItems) {
        if (li.category === "INCOME") agg.income += li.amount;
        else if (li.category === "BUSINESS_EXPENSE") agg.expenses += li.amount;
      }
      byBiz.set(e.businessId, agg);
    }

    const rows = businesses.map((b) => {
      const agg = byBiz.get(b.id) ?? { income: 0, expenses: 0 };
      const taxableProfit = agg.income - agg.expenses;
      return {
        id: b.id,
        name: b.name,
        income: agg.income,
        expenses: agg.expenses,
        taxableProfit,
        estimatedTax: estimateTax(taxableProfit, b.settings),
      };
    });

    return NextResponse.json({
      businesses: rows,
      combinedTaxableProfit: rows.reduce((s, r) => s + r.taxableProfit, 0),
      combinedTax: rows.reduce((s, r) => s + r.estimatedTax, 0),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load tax summary";
    if (message !== "Unauthorized") logError("businesses.tax_summary_failed", e);
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}
