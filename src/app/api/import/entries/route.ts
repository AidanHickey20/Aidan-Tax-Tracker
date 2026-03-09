import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

interface ImportLineItem {
  description: string;
  amount: number;
  category: string;
}

interface ImportAccountBalance {
  accountName: string;
  balance: number;
}

interface ImportInvestment {
  name: string;
  amount: number;
}

interface ImportEntry {
  weekStart: string;
  weekEnd: string;
  mileage: number;
  notes: string;
  lineItems: ImportLineItem[];
  accountBalances: ImportAccountBalance[];
  investments: ImportInvestment[];
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const { entries }: { entries: ImportEntry[] } = await request.json();

  const created = [];

  for (const entry of entries) {
    const result = await prisma.weeklyEntry.create({
      data: {
        userId,
        weekStart: new Date(entry.weekStart),
        weekEnd: new Date(entry.weekEnd),
        mileage: entry.mileage || 0,
        notes: entry.notes || "",
        lineItems: {
          create: entry.lineItems.map((item) => ({
            description: item.description,
            amount: item.amount,
            category: item.category,
          })),
        },
        accountBalances: {
          create: entry.accountBalances.map((b) => ({
            accountName: b.accountName,
            balance: b.balance,
          })),
        },
        investments: {
          create: entry.investments.map((inv) => ({
            name: inv.name,
            amount: inv.amount,
          })),
        },
      },
      include: { lineItems: true, accountBalances: true, investments: true },
    });
    created.push(result);
  }

  return NextResponse.json({ imported: created.length }, { status: 201 });
}
