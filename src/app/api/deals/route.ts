import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

const DEFAULT_STEPS = [
  { name: "ACQUISITION", sortOrder: 0 },
  { name: "DEMO", sortOrder: 1 },
  { name: "RENOVATION", sortOrder: 2 },
  { name: "LISTING", sortOrder: 3 },
  { name: "UNDER_CONTRACT", sortOrder: 4 },
  { name: "CLOSED", sortOrder: 5 },
];

export async function GET() {
  const userId = await requireUserId();
  const deals = await prisma.deal.findMany({
    where: { userId },
    include: { expenses: true, steps: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deals);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();
  const insuranceAmount = body.insurance || 0;
  const deal = await prisma.deal.create({
    data: {
      userId,
      address: body.address,
      nickname: body.nickname || "",
      purchasePrice: body.purchasePrice || 0,
      arv: body.arv || 0,
      notes: body.notes || "",
      steps: {
        create: DEFAULT_STEPS,
      },
      expenses: insuranceAmount > 0 ? {
        create: [{ description: "Property Insurance", amount: insuranceAmount, category: "INSURANCE" }],
      } : undefined,
    },
    include: { expenses: true, steps: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(deal, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  const existing = await prisma.deal.findFirst({ where: { id: body.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deal = await prisma.deal.update({
    where: { id: body.id },
    data: {
      address: body.address,
      nickname: body.nickname,
      purchasePrice: body.purchasePrice,
      arv: body.arv,
      status: body.status,
      notes: body.notes,
      closedAt: body.closedAt ? new Date(body.closedAt) : null,
    },
    include: { expenses: true, steps: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(deal);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  const { id } = await request.json();

  const existing = await prisma.deal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.deal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
