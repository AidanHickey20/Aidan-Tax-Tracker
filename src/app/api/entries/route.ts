import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentYearRange } from "@/lib/utils";
import { requireUserId } from "@/lib/get-user";
import { validate, createEntrySchema } from "@/lib/validations";
import { canUserEdit } from "@/lib/subscription";

const EXPIRED_MSG = { error: "Your trial has ended. Choose a plan to continue editing." };

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const searchParams = request.nextUrl.searchParams;
  const yearOnly = searchParams.get("yearOnly") === "true";
  const id = searchParams.get("id");

  if (id) {
    const entry = await prisma.weeklyEntry.findFirst({
      where: { id, userId },
      include: { lineItems: true, accountBalances: true, investments: true },
    });
    return NextResponse.json(entry);
  }

  // Return draft for a given week (used by auto-save)
  const draft = searchParams.get("draft");
  if (draft === "true") {
    const weekStart = searchParams.get("weekStart");
    const weekEnd = searchParams.get("weekEnd");
    if (weekStart && weekEnd) {
      const entry = await prisma.weeklyEntry.findFirst({
        where: {
          userId,
          status: "DRAFT",
          weekStart: new Date(weekStart),
          weekEnd: new Date(weekEnd),
        },
        include: { lineItems: true, accountBalances: true, investments: true },
      });
      return NextResponse.json(entry);
    }
  }

  if (yearOnly) {
    const { start, end } = getCurrentYearRange();
    const entries = await prisma.weeklyEntry.findMany({
      where: {
        userId,
        status: "SUBMITTED",
        weekStart: { gte: start },
        weekEnd: { lte: end },
      },
      include: { lineItems: true, accountBalances: true, investments: true },
      orderBy: { weekStart: "desc" },
    });
    return NextResponse.json(entries);
  }

  const entries = await prisma.weeklyEntry.findMany({
    where: { userId, status: "SUBMITTED" },
    include: { lineItems: true, accountBalances: true, investments: true },
    orderBy: { weekStart: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!(await canUserEdit(userId))) return NextResponse.json(EXPIRED_MSG, { status: 403 });
  const body = await request.json();
  const parsed = validate(createEntrySchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const entry = await prisma.weeklyEntry.create({
    data: {
      userId,
      weekStart: new Date(parsed.data.weekStart),
      weekEnd: new Date(parsed.data.weekEnd),
      mileage: parsed.data.mileage || 0,
      notes: parsed.data.notes || "",
      status: parsed.data.status || "SUBMITTED",
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

  return NextResponse.json(entry, { status: 201 });
}
