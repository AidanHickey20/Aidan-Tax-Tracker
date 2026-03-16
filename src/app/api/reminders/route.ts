import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, createReminderSchema, updateReminderSchema, deleteByIdSchema } from "@/lib/validations";

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
  const parsed = validate(createReminderSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const reminder = await prisma.reminder.create({
    data: {
      userId,
      message: parsed.data.message,
      frequency: parsed.data.frequency ?? "WEEKLY",
      scheduledDay: parsed.data.scheduledDay ?? -1,
      isActive: parsed.data.isActive ?? true,
    },
  });
  return NextResponse.json(reminder, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();
  const parsed = validate(updateReminderSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.reminder.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reminder = await prisma.reminder.update({
    where: { id: parsed.data.id },
    data: {
      message: parsed.data.message,
      frequency: parsed.data.frequency,
      scheduledDay: parsed.data.scheduledDay,
      isActive: parsed.data.isActive,
    },
  });
  return NextResponse.json(reminder);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.reminder.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.reminder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
