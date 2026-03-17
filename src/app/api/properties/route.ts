import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, createPropertySchema, updatePropertySchema, deleteByIdSchema } from "@/lib/validations";
import { isProUser } from "@/lib/subscription";
import { canUserEdit } from "@/lib/subscription";

const PRO_REQUIRED = { error: "Pro plan required" } as const;
const EXPIRED_MSG = { error: "Your trial has ended. Choose a plan to continue editing." };

export async function GET() {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  const properties = await prisma.property.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(properties);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(createPropertySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const property = await prisma.property.create({
    data: {
      userId,
      address: parsed.data.address,
      nickname: parsed.data.nickname,
      purchasePrice: parsed.data.purchasePrice,
      currentValue: parsed.data.currentValue,
      appreciationRate: parsed.data.appreciationRate,
      mortgageBalance: parsed.data.mortgageBalance,
      mortgageRate: parsed.data.mortgageRate,
      mortgagePayment: parsed.data.mortgagePayment,
      mortgageTerm: parsed.data.mortgageTerm,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : new Date(),
    },
  });
  return NextResponse.json(property, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(updatePropertySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = await prisma.property.findFirst({ where: { id: parsed.data.id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const property = await prisma.property.update({
    where: { id: parsed.data.id },
    data: {
      address: parsed.data.address,
      nickname: parsed.data.nickname,
      purchasePrice: parsed.data.purchasePrice,
      currentValue: parsed.data.currentValue,
      appreciationRate: parsed.data.appreciationRate,
      mortgageBalance: parsed.data.mortgageBalance,
      mortgageRate: parsed.data.mortgageRate,
      mortgagePayment: parsed.data.mortgagePayment,
      mortgageTerm: parsed.data.mortgageTerm,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
    },
  });
  return NextResponse.json(property);
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) return NextResponse.json(PRO_REQUIRED, { status: 403 });
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(deleteByIdSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { id } = parsed.data;

  const existing = await prisma.property.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
