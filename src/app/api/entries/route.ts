import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentYearRange } from "@/lib/utils";
import { requireUserId } from "@/lib/get-user";

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

  if (yearOnly) {
    const { start, end } = getCurrentYearRange();
    const entries = await prisma.weeklyEntry.findMany({
      where: {
        userId,
        weekStart: { gte: start },
        weekEnd: { lte: end },
      },
      include: { lineItems: true, accountBalances: true, investments: true },
      orderBy: { weekStart: "desc" },
    });
    return NextResponse.json(entries);
  }

  const entries = await prisma.weeklyEntry.findMany({
    where: { userId },
    include: { lineItems: true, accountBalances: true, investments: true },
    orderBy: { weekStart: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  const entry = await prisma.weeklyEntry.create({
    data: {
      userId,
      weekStart: new Date(body.weekStart),
      weekEnd: new Date(body.weekEnd),
      mileage: body.mileage || 0,
      notes: body.notes || "",
      lineItems: {
        create: (body.lineItems || []).map(
          (item: { description: string; amount: number; category: string }) => ({
            description: item.description,
            amount: item.amount,
            category: item.category,
          })
        ),
      },
      accountBalances: {
        create: (body.accountBalances || []).map(
          (item: { accountName: string; balance: number }) => ({
            accountName: item.accountName,
            balance: item.balance,
          })
        ),
      },
      investments: {
        create: (body.investments || []).map(
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
