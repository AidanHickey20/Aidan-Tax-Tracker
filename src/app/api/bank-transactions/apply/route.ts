import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek } from "date-fns";

export async function POST() {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const transactions = await prisma.importedTransaction.findMany({
    where: { userId, status: "CATEGORIZED" },
    orderBy: { date: "asc" },
  });

  if (transactions.length === 0) {
    return NextResponse.json({ applied: 0 });
  }

  // Group transactions by their week (Monday-Sunday)
  const weekGroups = new Map<
    string,
    { weekStart: Date; weekEnd: Date; txns: typeof transactions }
  >();

  for (const txn of transactions) {
    const ws = startOfWeek(txn.date, { weekStartsOn: 1 });
    const we = endOfWeek(txn.date, { weekStartsOn: 1 });
    const key = ws.toISOString();

    if (!weekGroups.has(key)) {
      weekGroups.set(key, { weekStart: ws, weekEnd: we, txns: [] });
    }
    weekGroups.get(key)!.txns.push(txn);
  }

  let applied = 0;

  for (const [, group] of weekGroups) {
    // Find or create the weekly entry
    let entry = await prisma.weeklyEntry.findFirst({
      where: {
        userId,
        weekStart: group.weekStart,
      },
    });

    if (!entry) {
      entry = await prisma.weeklyEntry.create({
        data: {
          userId,
          weekStart: group.weekStart,
          weekEnd: group.weekEnd,
        },
      });
    }

    // Create line items for each transaction
    await prisma.lineItem.createMany({
      data: group.txns.map((txn) => ({
        weeklyEntryId: entry!.id,
        description: txn.name,
        amount: Math.abs(txn.amount),
        category: txn.category!,
      })),
    });

    // Mark transactions as applied
    await prisma.importedTransaction.updateMany({
      where: { id: { in: group.txns.map((t) => t.id) } },
      data: { status: "APPLIED", weeklyEntryId: entry.id },
    });

    applied += group.txns.length;
  }

  return NextResponse.json({ applied });
}
