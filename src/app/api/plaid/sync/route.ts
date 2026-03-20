import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  bankId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const bank = await prisma.linkedBank.findFirst({
    where: { id: parsed.data.bankId, userId },
  });
  if (!bank) {
    return NextResponse.json({ error: "Bank not found" }, { status: 404 });
  }

  let cursor = bank.cursor || undefined;
  let hasMore = true;
  let added = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: bank.accessToken,
      cursor,
    });

    const { added: newTxns, next_cursor, has_more } = response.data;

    for (const txn of newTxns) {
      await prisma.importedTransaction.upsert({
        where: { plaidTransactionId: txn.transaction_id },
        create: {
          userId,
          linkedBankId: bank.id,
          plaidTransactionId: txn.transaction_id,
          date: new Date(txn.date),
          name: txn.merchant_name || txn.name || "Unknown",
          amount: txn.amount,
          status: "PENDING",
        },
        update: {
          date: new Date(txn.date),
          name: txn.merchant_name || txn.name || "Unknown",
          amount: txn.amount,
        },
      });
      added++;
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  await prisma.linkedBank.update({
    where: { id: bank.id },
    data: { cursor, lastSyncedAt: new Date() },
  });

  return NextResponse.json({ imported: added });
}
