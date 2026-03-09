import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function GET() {
  const userId = await requireUserId();
  const reminders = await prisma.reminder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reminders);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();
  const reminder = await prisma.reminder.create({
    data: {
      userId,
      message: body.message,
      frequency: body.frequency ?? "WEEKLY",
      scheduledDay: body.scheduledDay ?? -1,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(reminder, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  const existing = await prisma.reminder.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reminder = await prisma.reminder.update({
    where: { id: body.id },
    data: {
      message: body.message,
      frequency: body.frequency,
      scheduledDay: body.scheduledDay,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(reminder);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  const { id } = await request.json();

  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reminder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
