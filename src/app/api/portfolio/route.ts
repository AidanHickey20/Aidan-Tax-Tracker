import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, createInvestmentSchema, updateInvestmentSchema, deleteByIdSchema } from "@/lib/validations";
import { canUserEdit } from "@/lib/subscription";

const EXPIRED_MSG = { error: "Your trial has ended. Choose a plan to continue editing." };

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
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  try {
    const body = await request.json();
    const parsed = validate(createInvestmentSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const investment = await prisma.trackedInvestment.create({
      data: {
        userId,
        symbol: parsed.data.type === "CRYPTO" ? parsed.data.symbol.toLowerCase() : parsed.data.symbol.toUpperCase(),
        name: parsed.data.name,
        type: parsed.data.type,
        shares: parsed.data.shares || 0,
        avgCost: parsed.data.avgCost || 0,
        recurringAmount: parsed.data.recurringAmount || 0,
        recurringDay: parsed.data.recurringDay ?? -1,
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
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(updateInvestmentSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.trackedInvestment.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const investment = await prisma.trackedInvestment.update({
    where: { id: parsed.data.id },
    data: {
      symbol: parsed.data.symbol,
      name: parsed.data.name,
      type: parsed.data.type,
      shares: parsed.data.shares,
      avgCost: parsed.data.avgCost,
      recurringAmount: parsed.data.recurringAmount || 0,
      recurringDay: parsed.data.recurringDay ?? -1,
    },
  });
  return NextResponse.json(investment);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.trackedInvestment.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trackedInvestment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
