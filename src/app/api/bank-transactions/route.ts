import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET - fetch transactions by status
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "PENDING";

  const transactions = await prisma.importedTransaction.findMany({
    where: { userId, status },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

const categorizeSchema = z.object({
  id: z.string().min(1),
  category: z.enum(["INCOME", "BUSINESS_EXPENSE", "PERSONAL_EXPENSE", "OWNER_DRAW"]).nullable(),
  status: z.enum(["CATEGORIZED", "SKIPPED", "PENDING"]),
});

// PUT - categorize a single transaction
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

  const { id, category, status } = parsed.data;

  const txn = await prisma.importedTransaction.findFirst({
    where: { id, userId },
  });
  if (!txn) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  await prisma.importedTransaction.update({
    where: { id },
    data: { category, status },
  });

  return NextResponse.json({ success: true });
}
