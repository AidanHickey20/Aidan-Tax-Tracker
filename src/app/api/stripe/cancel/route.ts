import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const userId = await requireUserId();

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    return NextResponse.json({ error: "No subscription found" }, { status: 400 });
  }

  // If they have a Stripe subscription, cancel it at period end
  if (sub.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (err) {
      console.error("Failed to cancel Stripe subscription:", err);
      return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
  }

  // Mark as canceled in our database
  await prisma.subscription.update({
    where: { userId },
    data: { status: "CANCELED" },
  });

  return NextResponse.json({ success: true });
}
