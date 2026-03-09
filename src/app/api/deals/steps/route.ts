import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  // Verify ownership through the deal
  const stepCheck = await prisma.dealStep.findUnique({ where: { id: body.id }, include: { deal: true } });
  if (!stepCheck || stepCheck.deal.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const step = await prisma.dealStep.update({
    where: { id: body.id },
    data: {
      completed: body.completed,
      completedAt: body.completed ? new Date() : null,
      notes: body.notes ?? undefined,
    },
  });

  // Update the deal's status to the latest completed step
  if (body.completed) {
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
