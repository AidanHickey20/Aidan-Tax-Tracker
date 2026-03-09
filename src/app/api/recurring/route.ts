import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

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
  const body = await request.json();
  const item = await prisma.recurringItem.create({
    data: {
      userId,
      description: body.description,
      amount: body.amount,
      category: body.category,
      frequency: body.frequency ?? "WEEKLY",
      scheduledDay: body.scheduledDay ?? -1,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  const existing = await prisma.recurringItem.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.recurringItem.update({
    where: { id: body.id },
    data: {
      description: body.description,
      amount: body.amount,
      category: body.category,
      frequency: body.frequency,
      scheduledDay: body.scheduledDay,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  const { id } = await request.json();

  const existing = await prisma.recurringItem.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.recurringItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
