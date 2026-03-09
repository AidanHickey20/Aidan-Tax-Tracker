import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

// One-time migration: assign all unclaimed (userId=null) data to the first user who calls this
export async function POST() {
  const userId = await requireUserId();

  // Check if there is any unclaimed data
  const unclaimedEntries = await prisma.weeklyEntry.count({ where: { userId: null } });
  const unclaimedRecurring = await prisma.recurringItem.count({ where: { userId: null } });
  const unclaimedInvestments = await prisma.trackedInvestment.count({ where: { userId: null } });
  const unclaimedDeals = await prisma.deal.count({ where: { userId: null } });
  const unclaimedReminders = await prisma.reminder.count({ where: { userId: null } });

  const total = unclaimedEntries + unclaimedRecurring + unclaimedInvestments + unclaimedDeals + unclaimedReminders;

  if (total === 0) {
    return NextResponse.json({ message: "No unclaimed data to migrate", claimed: 0 });
  }

  // Assign all unclaimed data to this user
  await Promise.all([
    prisma.weeklyEntry.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.recurringItem.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.trackedInvestment.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.deal.updateMany({ where: { userId: null }, data: { userId } }),
    prisma.reminder.updateMany({ where: { userId: null }, data: { userId } }),
  ]);

  return NextResponse.json({ message: "Data claimed successfully", claimed: total });
}
