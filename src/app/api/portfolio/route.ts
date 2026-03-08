import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const investments = await prisma.trackedInvestment.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(investments);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const investment = await prisma.trackedInvestment.create({
      data: {
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
  const body = await request.json();
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
  const { id } = await request.json();
  await prisma.trackedInvestment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
