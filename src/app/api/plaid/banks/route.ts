import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const banks = await prisma.linkedBank.findMany({
    where: { userId },
    select: {
      id: true,
      institutionName: true,
      lastSyncedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(banks);
}
