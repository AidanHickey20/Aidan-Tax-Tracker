import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentYearRange } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const yearOnly = searchParams.get("yearOnly") === "true";
  const id = searchParams.get("id");

  if (id) {
    const entry = await prisma.weeklyEntry.findUnique({
      where: { id },
      include: { lineItems: true, accountBalances: true, investments: true },
    });
    return NextResponse.json(entry);
  }

  if (yearOnly) {
    const { start, end } = getCurrentYearRange();
    const entries = await prisma.weeklyEntry.findMany({
      where: {
        weekStart: { gte: start },
        weekEnd: { lte: end },
      },
      include: { lineItems: true, accountBalances: true, investments: true },
      orderBy: { weekStart: "desc" },
    });
    return NextResponse.json(entries);
  }

  const entries = await prisma.weeklyEntry.findMany({
    include: { lineItems: true, accountBalances: true, investments: true },
    orderBy: { weekStart: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const entry = await prisma.weeklyEntry.create({
    data: {
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
