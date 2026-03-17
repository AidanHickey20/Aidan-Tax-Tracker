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

      // When closing a deal with profit, add it as INCOME to the current week's entry
      if (isClosed && profit > 0) {
        const deal = stepCheck.deal;
        const dealLabel = deal.nickname || deal.address;
        const { start, end } = getCurrentWeekRange();

        // Find or create the current week's entry
        let entry = await prisma.weeklyEntry.findFirst({
          where: {
            userId,
            weekStart: start,
            weekEnd: end,
          },
        });

        if (!entry) {
          entry = await prisma.weeklyEntry.create({
            data: {
              userId,
              weekStart: start,
              weekEnd: end,
            },
          });
        }

        // Add the profit as an INCOME line item
        await prisma.lineItem.create({
          data: {
            weeklyEntryId: entry.id,
            description: `Deal closed: ${dealLabel}`,
            amount: profit,
            category: "INCOME",
          },
        });
      }
    }
  }

  return NextResponse.json(step);
}
