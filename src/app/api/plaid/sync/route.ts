import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { plaidClient, normalizeMerchant } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  bankId: z.string().min(1).optional(), // omit to sync all linked cards
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!(await isProUser(userId))) {
    return NextResponse.json({ error: "Pro plan required" }, { status: 403 });
  }

  // Cost control: Plaid calls cost money, so throttle per user.
  const { ok } = rateLimit(`plaid-sync:${userId}`, { limit: 15, windowMs: 5 * 60 * 1000 });
  if (!ok) {
    return NextResponse.json({ error: "Syncing too often. Try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const banks = await prisma.linkedBank.findMany({
    where: { userId, ...(parsed.data.bankId ? { id: parsed.data.bankId } : {}) },
  });
  if (banks.length === 0) {
    return NextResponse.json({ error: "No linked cards" }, { status: 404 });
  }

  // Load the user's remembered merchant → category rules once.
  const rules = await prisma.merchantRule.findMany({ where: { userId } });
  const ruleMap = new Map(rules.map((r) => [r.merchant, r.category]));

  let imported = 0;
  let autoFiled = 0;

  for (const bank of banks) {
    let accessToken: string;
    try {
      accessToken = decryptSecret(bank.accessToken);
    } catch {
      continue; // corrupt/rotated key — skip this card
    }

    let cursor = bank.cursor || undefined;
    let hasMore = true;

    try {
      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor,
        });
        const { added, modified, removed, next_cursor, has_more } = response.data;

        for (const txn of [...added, ...modified]) {
          const displayName = txn.merchant_name || txn.name || "Unknown";
          const merchantKey = normalizeMerchant(displayName);
          const ruleCategory = ruleMap.get(merchantKey);

          await prisma.importedTransaction.upsert({
            where: { plaidTransactionId: txn.transaction_id },
            create: {
              userId,
              linkedBankId: bank.id,
              plaidTransactionId: txn.transaction_id,
              date: new Date(txn.date),
              name: displayName,
              merchant: merchantKey,
              amount: txn.amount,
              category: ruleCategory ?? null,
              status: ruleCategory ? "CATEGORIZED" : "PENDING",
              autoCategorized: !!ruleCategory,
            },
            // On modify, refresh facts but never clobber a decision the user
            // already made (category/status left untouched).
            update: {
              date: new Date(txn.date),
              name: displayName,
              merchant: merchantKey,
              amount: txn.amount,
            },
          });
          imported++;
          if (ruleCategory) autoFiled++;
        }

        // Remove transactions Plaid deleted, unless already filed into an entry.
        for (const r of removed) {
          if (!r.transaction_id) continue;
          await prisma.importedTransaction.deleteMany({
            where: { plaidTransactionId: r.transaction_id, userId, status: { not: "APPLIED" } },
          });
        }

        cursor = next_cursor;
        hasMore = has_more;
      }
    } catch {
      return NextResponse.json({ error: "Could not sync transactions. Try again." }, { status: 502 });
    }

    await prisma.linkedBank.update({
      where: { id: bank.id },
      data: { cursor, lastSyncedAt: new Date() },
    });
  }

  return NextResponse.json({ imported, autoFiled });
}
