import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { prisma } from "@/lib/prisma";
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

  // Cascade deletes associated transactions
  await prisma.linkedBank.delete({ where: { id: bank.id } });

  return NextResponse.json({ success: true });
}
