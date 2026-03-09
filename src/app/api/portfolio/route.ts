import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function GET() {
  const userId = await requireUserId();
  const investments = await prisma.trackedInvestment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(investments);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  try {
    const body = await request.json();
    const investment = await prisma.trackedInvestment.create({
      data: {
        userId,
        symbol: body.type === "CRYPTO" ? body.symbol.toLowerCase() : body.symbol.toUpperCase(),
        name: body.name,
        type: body.type,
        shares: body.shares || 0,
        avgCost: body.avgCost || 0,
        recurringAmount: body.recurringAmount || 0,
        recurringDay: body.recurringDay ?? -1,
      },
    });
    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    console.error("Failed to create investment:", error);
    return NextResponse.json({ error: "Failed to create investment" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  const existing = await prisma.trackedInvestment.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const investment = await prisma.trackedInvestment.update({
    where: { id: body.id },
    data: {
      symbol: body.symbol,
      name: body.name,
      type: body.type,
      shares: body.shares,
      avgCost: body.avgCost,
      recurringAmount: body.recurringAmount || 0,
      recurringDay: body.recurringDay ?? -1,
    },
  });
  return NextResponse.json(investment);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  const { id } = await request.json();

  const existing = await prisma.trackedInvestment.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trackedInvestment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
