import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { DEFAULT_DEAL_STEPS, DEFAULT_WHOLESALE_STEPS } from "@/lib/constants";
import { validate, createDealSchema, updateDealSchema, deleteByIdSchema } from "@/lib/validations";
import { isProUser } from "@/lib/subscription";

const PRO_REQUIRED = { error: "Pro plan required" } as const;


export async function GET() {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  const deals = await prisma.deal.findMany({
    where: { userId },
    include: { expenses: true, steps: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deals);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  const body = await request.json();
  const parsed = validate(createDealSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const dealType = parsed.data.dealType || "FIX_AND_FLIP";
  const insuranceAmount = parsed.data.insurance || 0;

  // Build steps based on deal type
  let steps: { name: string; sortOrder: number; deadline?: Date | null }[];

  if (dealType === "REALTOR") {
    const contingencies = parsed.data.contingencies || [];
    steps = [
      { name: "UNDER_CONTRACT", sortOrder: 0 },
      { name: "EARNEST_MONEY", sortOrder: 1 },
      ...contingencies.map((c, i) => ({
        name: `CONTINGENCY:${c.name}`,
        sortOrder: i + 2,
        deadline: c.deadline ? new Date(c.deadline) : null,
      })),
      { name: "CONTINGENCIES_REMOVED", sortOrder: contingencies.length + 2 },
      { name: "CLOSING", sortOrder: contingencies.length + 3 },
      { name: "CLOSED", sortOrder: contingencies.length + 4 },
    ];
  } else if (dealType === "WHOLESALE") {
    steps = DEFAULT_WHOLESALE_STEPS;
  } else {
    steps = DEFAULT_DEAL_STEPS;
  }

  const deal = await prisma.deal.create({
    data: {
      userId,
      dealType,
      address: parsed.data.address,
      nickname: parsed.data.nickname || "",
      purchasePrice: parsed.data.purchasePrice || 0,
      arv: parsed.data.arv || 0,
      assignmentFee: parsed.data.assignmentFee || 0,
      underContractDate: parsed.data.underContractDate ? new Date(parsed.data.underContractDate) : null,
      targetCloseDate: parsed.data.targetCloseDate ? new Date(parsed.data.targetCloseDate) : null,
      status: dealType === "REALTOR" ? "UNDER_CONTRACT" : "ACQUISITION",
      notes: parsed.data.notes || "",
      steps: {
        create: steps,
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
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  const body = await request.json();
  const parsed = validate(updateDealSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.deal.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deal = await prisma.deal.update({
    where: { id: parsed.data.id },
    data: {
      address: parsed.data.address,
      nickname: parsed.data.nickname,
      purchasePrice: parsed.data.purchasePrice,
      arv: parsed.data.arv,
      assignmentFee: parsed.data.assignmentFee ?? existing.assignmentFee,
      underContractDate: parsed.data.underContractDate !== undefined
        ? (parsed.data.underContractDate ? new Date(parsed.data.underContractDate) : null)
        : undefined,
      targetCloseDate: parsed.data.targetCloseDate !== undefined
        ? (parsed.data.targetCloseDate ? new Date(parsed.data.targetCloseDate) : null)
        : undefined,
      status: parsed.data.status,
      notes: parsed.data.notes,
      closedAt: parsed.data.closedAt ? new Date(parsed.data.closedAt) : null,
    },
    include: { expenses: true, steps: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(deal);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.deal.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.deal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
