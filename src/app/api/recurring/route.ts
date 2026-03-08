import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.recurringItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const item = await prisma.recurringItem.create({
    data: {
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
  const body = await request.json();
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
  const { id } = await request.json();
  await prisma.recurringItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
