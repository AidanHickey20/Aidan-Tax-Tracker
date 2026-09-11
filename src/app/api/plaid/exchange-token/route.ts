import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { z } from "zod";

const schema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().max(200).optional(),
  institutionName: z.string().max(200).optional(),
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

  const { publicToken, institutionId, institutionName } = parsed.data;

  let accessToken: string;
  let itemId: string;
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    accessToken = response.data.access_token;
    itemId = response.data.item_id;
  } catch {
    return NextResponse.json({ error: "Could not link card. Try again." }, { status: 502 });
  }

  // Encrypt the access token before it ever touches the database.
  const encrypted = encryptSecret(accessToken);

  await prisma.linkedBank.upsert({
    where: { userId_itemId: { userId, itemId } },
    create: {
      userId,
      accessToken: encrypted,
      itemId,
      institutionId: institutionId || null,
      institutionName: institutionName || null,
    },
    update: {
      accessToken: encrypted,
      institutionId: institutionId || null,
      institutionName: institutionName || null,
    },
  });

  return NextResponse.json({ success: true });
}
