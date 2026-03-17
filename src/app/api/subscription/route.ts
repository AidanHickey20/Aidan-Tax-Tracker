import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/get-user";
import { getUserSubscription } from "@/lib/subscription";

export async function GET() {
  const userId = await requireUserId();
  const sub = await getUserSubscription(userId);

  if (!sub) {
    return NextResponse.json({
      plan: "EXPIRED",
      status: "EXPIRED",
      trialEndsAt: null,
      currentPeriodEnd: null,
    });
  }

  return NextResponse.json({
    plan: sub.status === "EXPIRED" || sub.status === "CANCELED" ? "EXPIRED" : sub.plan,
    status: sub.status,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    hasStripeCustomer: !!sub.stripeCustomerId,
  });
}
