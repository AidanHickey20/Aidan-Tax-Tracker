import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, updateEntrySchema } from "@/lib/validations";
import { canUserEdit } from "@/lib/subscription";

const EXPIRED_MSG = { error: "Your trial has ended. Choose a plan to continue editing." };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUserId();
  const { id } = await params;
  const entry = await prisma.weeklyEntry.findFirst({
    where: { id, userId },
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
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const parsed = validate(updateEntrySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // Verify ownership
  const existing = await prisma.weeklyEntry.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete existing related records and recreate
  await prisma.lineItem.deleteMany({ where: { weeklyEntryId: id } });
  await prisma.accountBalance.deleteMany({ where: { weeklyEntryId: id } });
  await prisma.investmentEntry.deleteMany({ where: { weeklyEntryId: id } });

  const entry = await prisma.weeklyEntry.update({
    where: { id },
    data: {
      weekStart: new Date(parsed.data.weekStart),
      weekEnd: new Date(parsed.data.weekEnd),
      mileage: parsed.data.mileage || 0,
      notes: parsed.data.notes || "",
      status: parsed.data.status || existing.status,
      lineItems: {
        create: (parsed.data.lineItems || []).map(
          (item: { description: string; amount: number; category: string }) => ({
            description: item.description,
            amount: item.amount,
            category: item.category,
          })
        ),
      },
      accountBalances: {
        create: (parsed.data.accountBalances || []).map(
          (item: { accountName: string; balance: number }) => ({
            accountName: item.accountName,
            balance: item.balance,
          })
        ),
      },
      investments: {
        create: (parsed.data.investments || []).map(
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
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const { id } = await params;

  const existing = await prisma.weeklyEntry.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.weeklyEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
