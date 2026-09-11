import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, updateDealStepSchema } from "@/lib/validations";
import { isProUser } from "@/lib/subscription";
import { getCurrentWeekRange } from "@/lib/utils";

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  const body = await request.json();
  const parsed = validate(updateDealStepSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Verify ownership through the deal
  const stepCheck = await prisma.dealStep.findUnique({ where: { id: parsed.data.id }, include: { deal: true } });
  if (!stepCheck || stepCheck.deal.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const step = await prisma.dealStep.update({
    where: { id: parsed.data.id },
    data: {
      completed: parsed.data.completed,
      completedAt: parsed.data.completed ? new Date() : null,
      notes: parsed.data.notes ?? undefined,
    },
  });

  // Update the deal's status to the latest completed step
  if (parsed.data.completed) {
    const allSteps = await prisma.dealStep.findMany({
      where: { dealId: step.dealId },
      orderBy: { sortOrder: "asc" },
    });
    const lastCompleted = [...allSteps].reverse().find((s) => s.completed);
    if (lastCompleted) {
      const isClosed = lastCompleted.name === "CLOSED";
      const profit = parsed.data.profit ?? 0;

      await prisma.deal.update({
        where: { id: step.dealId },
        data: {
          status: lastCompleted.name,
          closedAt: isClosed ? new Date() : null,
          ...(isClosed && profit > 0 ? { closedProfit: profit } : {}),
        },
      });

      // When closing a deal with profit, optionally reflect it in the current
      // week's entry. The profit is always saved on the deal record (above);
      // here we add weekly line items unless the user says they've handled it.
      if (isClosed && profit > 0) {
        const deal = stepCheck.deal;
        const dealLabel = deal.nickname || deal.address;

        // INCOME line item — skipped if the user already logged this income.
        const addIncome = parsed.data.incomeAlreadyReported !== true;

        // Rehab write-off (Fix & Flip only) — opted in per-deal at close.
        let rehab = 0;
        if (parsed.data.addRehabWriteoff && deal.dealType === "FIX_AND_FLIP") {
          const rehabTotal = await prisma.dealExpense.aggregate({
            where: { dealId: deal.id },
            _sum: { amount: true },
          });
          rehab = rehabTotal._sum.amount ?? 0;
        }
        const addRehab = rehab > 0;

        // Only touch a weekly entry if we're actually adding a line item.
        if (addIncome || addRehab) {
          const { start, end } = getCurrentWeekRange();
          let entry = await prisma.weeklyEntry.findFirst({
            where: { userId, weekStart: start, weekEnd: end },
          });
          if (!entry) {
            entry = await prisma.weeklyEntry.create({
              data: { userId, weekStart: start, weekEnd: end },
            });
          }

          if (addIncome) {
            await prisma.lineItem.create({
              data: {
                weeklyEntryId: entry.id,
                description: `Deal closed: ${dealLabel}`,
                amount: profit,
                category: "INCOME",
              },
            });
          }

          if (addRehab) {
            await prisma.lineItem.create({
              data: {
                weeklyEntryId: entry.id,
                description: `Rehab: ${dealLabel}`,
                amount: rehab,
                category: "BUSINESS_EXPENSE",
              },
            });
          }
        }
      }
    }
  }

  return NextResponse.json(step);
}
