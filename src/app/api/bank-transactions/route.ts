import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET - fetch transactions by status (default PENDING: the review queue)
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = z
    .enum(["PENDING", "CATEGORIZED", "SKIPPED", "APPLIED"])
    .catch("PENDING")
    .parse(searchParams.get("status"));

  const transactions = await prisma.importedTransaction.findMany({
    where: { userId, status },
    orderBy: { date: "desc" },
    take: 500,
    select: {
      id: true,
      date: true,
      name: true,
      merchant: true,
      amount: true,
      category: true,
      status: true,
      autoCategorized: true,
    },
  });

  return NextResponse.json(transactions);
}

const categorizeSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_EXPENSE", "OWNER_DRAW"]).nullable(),
  status: z.enum(["CATEGORIZED", "SKIPPED", "PENDING"]),
  // When true (and a category is chosen), remember this merchant so future
  // transactions from it are auto-categorized on sync.
  remember: z.boolean().optional().default(false),
});

// PUT - categorize a single transaction (the personal/business decision)
export async function PUT(req: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = categorizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { id, category, status, remember } = parsed.data;

  const txn = await prisma.importedTransaction.findFirst({
    where: { id, userId },
  });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.importedTransaction.update({
    where: { id },
    data: { category, status, autoCategorized: false },
  });

  // Remember the merchant rule for next time.
  if (remember && category && txn.merchant) {
    await prisma.merchantRule.upsert({
      where: { userId_merchant: { userId, merchant: txn.merchant } },
      create: { userId, merchant: txn.merchant, category },
      update: { category },
    });
  }

  return NextResponse.json({ success: true });
}
