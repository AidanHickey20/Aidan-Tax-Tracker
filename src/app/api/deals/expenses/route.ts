import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
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
  const { id } = await request.json();
  await prisma.dealExpense.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
