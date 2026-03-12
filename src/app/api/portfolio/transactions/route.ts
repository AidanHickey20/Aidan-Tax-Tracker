import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
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
