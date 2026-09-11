import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { prisma } from "@/lib/prisma";
import { plaidClient } from "@/lib/plaid";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

const schema = z.object({
  bankId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const userId = await requireUserId();

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

  // Best-effort: revoke the item at Plaid so the token is dead even if our DB
  // row somehow lingers. Failure here shouldn't block local disconnection.
  try {
    await plaidClient.itemRemove({ access_token: decryptSecret(bank.accessToken) });
  } catch {
    // ignore — proceed to delete locally regardless
  }

  // Cascade deletes associated transactions.
  await prisma.linkedBank.delete({ where: { id: bank.id } });

  return NextResponse.json({ success: true });
}
