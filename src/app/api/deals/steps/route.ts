import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, updateDealStepSchema } from "@/lib/validations";
import { isProUser } from "@/lib/subscription";

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
      await prisma.deal.update({
        where: { id: step.dealId },
        data: {
          status: lastCompleted.name,
          closedAt: lastCompleted.name === "CLOSED" ? new Date() : null,
        },
      });
    }
  }

  return NextResponse.json(step);
}
