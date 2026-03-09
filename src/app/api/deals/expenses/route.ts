import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  // Verify the deal belongs to the user
  const deal = await prisma.deal.findFirst({ where: { id: body.dealId, userId } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expense = await prisma.dealExpense.create({
    data: {
      description: body.description,
      amount: body.amount,
      category: body.category,
      dealId: body.dealId,
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
    },
  });
  return NextResponse.json(expense, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  const { id } = await request.json();

  // Verify ownership through the deal
  const expense = await prisma.dealExpense.findUnique({ where: { id }, include: { deal: true } });
  if (!expense || expense.deal.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.dealExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
