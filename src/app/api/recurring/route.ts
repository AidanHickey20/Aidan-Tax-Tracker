import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, createRecurringSchema, updateRecurringSchema, deleteByIdSchema } from "@/lib/validations";
import { canUserEdit } from "@/lib/subscription";

const EXPIRED_MSG = { error: "Your trial has ended. Choose a plan to continue editing." };

export async function GET() {
  const userId = await requireUserId();
  const items = await prisma.recurringItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(createRecurringSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const item = await prisma.recurringItem.create({
    data: {
      userId,
      description: parsed.data.description,
      amount: parsed.data.amount,
      category: parsed.data.category,
      frequency: parsed.data.frequency ?? "WEEKLY",
      scheduledDay: parsed.data.scheduledDay ?? -1,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(updateRecurringSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.recurringItem.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.recurringItem.update({
    where: { id: parsed.data.id },
    data: {
      description: parsed.data.description,
      amount: parsed.data.amount,
      category: parsed.data.category,
      frequency: parsed.data.frequency,
      scheduledDay: parsed.data.scheduledDay,
      isActive: parsed.data.isActive,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.recurringItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
