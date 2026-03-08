import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const reminders = await prisma.reminder.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reminders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const reminder = await prisma.reminder.create({
    data: {
      message: body.message,
      frequency: body.frequency ?? "WEEKLY",
      scheduledDay: body.scheduledDay ?? -1,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(reminder, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
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
  const { id } = await request.json();
  await prisma.reminder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
