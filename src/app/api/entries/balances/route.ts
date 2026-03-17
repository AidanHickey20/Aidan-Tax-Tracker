import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { canUserEdit } from "@/lib/subscription";
import { getCurrentWeekRange } from "@/lib/utils";

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) {
    return NextResponse.json({ error: "Your trial has ended. Choose a plan to continue editing." }, { status: 403 });
  }

  const body = await request.json();
  const balances: { accountName: string; balance: number }[] = body.balances || [];

  // Find the latest entry for this user
  let entry = await prisma.weeklyEntry.findFirst({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });

  // If no entry exists, create one for the current week
  if (!entry) {
    const { start, end } = getCurrentWeekRange();
    entry = await prisma.weeklyEntry.create({
      data: { userId, weekStart: start, weekEnd: end },
    });
  }

  // Replace account balances on that entry
  await prisma.accountBalance.deleteMany({ where: { weeklyEntryId: entry.id } });
  if (balances.length > 0) {
    await prisma.accountBalance.createMany({
      data: balances
        .filter((b) => b.balance !== 0)
        .map((b) => ({
          weeklyEntryId: entry.id,
          accountName: b.accountName,
          balance: b.balance,
        })),
    });
  }

  // Return updated balances
  const updated = await prisma.accountBalance.findMany({
    where: { weeklyEntryId: entry.id },
  });

  return NextResponse.json(updated);
}
