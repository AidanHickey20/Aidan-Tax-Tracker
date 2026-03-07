import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await prisma.weeklyEntry.findUnique({
    where: { id },
    include: { lineItems: true, accountBalances: true, investments: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Delete existing related records and recreate
  await prisma.lineItem.deleteMany({ where: { weeklyEntryId: id } });
  await prisma.accountBalance.deleteMany({ where: { weeklyEntryId: id } });
  await prisma.investmentEntry.deleteMany({ where: { weeklyEntryId: id } });

  const entry = await prisma.weeklyEntry.update({
    where: { id },
    data: {
      weekStart: new Date(body.weekStart),
      weekEnd: new Date(body.weekEnd),
      mileage: body.mileage || 0,
      notes: body.notes || "",
      lineItems: {
        create: (body.lineItems || []).map(
          (item: { description: string; amount: number; category: string }) => ({
            description: item.description,
            amount: item.amount,
            category: item.category,
          })
        ),
      },
      accountBalances: {
        create: (body.accountBalances || []).map(
          (item: { accountName: string; balance: number }) => ({
            accountName: item.accountName,
            balance: item.balance,
          })
        ),
      },
      investments: {
        create: (body.investments || []).map(
          (item: { name: string; amount: number }) => ({
            name: item.name,
            amount: item.amount,
          })
        ),
      },
    },
    include: { lineItems: true, accountBalances: true, investments: true },
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.weeklyEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
