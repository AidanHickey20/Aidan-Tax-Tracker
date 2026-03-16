import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, createDealExpenseSchema, deleteByIdSchema } from "@/lib/validations";
import { isProUser } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  const body = await request.json();
  const parsed = validate(createDealExpenseSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Verify the deal belongs to the user
  const deal = await prisma.deal.findFirst({ where: { id: parsed.data.dealId, userId } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expense = await prisma.dealExpense.create({
    data: {
      description: parsed.data.description,
      amount: parsed.data.amount,
      category: parsed.data.category,
      dealId: parsed.data.dealId,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
    },
  });
  return NextResponse.json(expense, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  // Verify ownership through the deal
  const expense = await prisma.dealExpense.findUnique({ where: { id }, include: { deal: true } });
  if (!expense || expense.deal.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.dealExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
