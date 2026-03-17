import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  const investmentId = request.nextUrl.searchParams.get("investmentId");

  const where: { userId: string; investmentId?: string } = { userId };
  if (investmentId) where.investmentId = investmentId;

  const transactions = await prisma.investmentTransaction.findMany({
    where,
    orderBy: { executedAt: "desc" },
    take: 50,
    include: {
      investment: { select: { symbol: true, name: true, type: true } },
    },
  });

  return NextResponse.json(transactions);
}
