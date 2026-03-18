import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

const PROMO_CODES: Record<string, { plan: string }> = {
  HICKEYFREE: { plan: "PRO" },
};

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();
  const code = (body.code || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Please enter a promo code" }, { status: 400 });
  }

  const promo = PROMO_CODES[code];
  if (!promo) {
    return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
  }

  // Check if user already has an active paid plan
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub && (sub.plan === "PRO" || sub.plan === "BASIC") && sub.status === "ACTIVE") {
    return NextResponse.json({ error: "You already have an active subscription" }, { status: 400 });
  }

  // Apply the promo
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: promo.plan,
      status: "ACTIVE",
    },
    create: {
      userId,
      plan: promo.plan,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ success: true, plan: promo.plan });
}
