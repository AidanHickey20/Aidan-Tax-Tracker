import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { isProUser } from "@/lib/subscription";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().optional(),
  institutionName: z.string().optional(),
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

  const response = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const { access_token, item_id } = response.data;

  await prisma.linkedBank.upsert({
    where: { userId_itemId: { userId, itemId: item_id } },
    create: {
      userId,
      accessToken: access_token,
      itemId: item_id,
      institutionId: institutionId || null,
      institutionName: institutionName || null,
    },
    update: {
      accessToken: access_token,
      institutionId: institutionId || null,
      institutionName: institutionName || null,
    },
  });

  return NextResponse.json({ success: true });
}
