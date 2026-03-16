import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan; // "BASIC" or "PRO"
      if (!userId || !plan) break;

      const subscriptionId = session.subscription as string;

      // Fetch the Stripe subscription to get the current period end
      const stripeSub = await getStripe().subscriptions.retrieve(subscriptionId);
      const periodEnd = stripeSub.items.data[0]?.current_period_end;

      await prisma.subscription.update({
        where: { userId },
        data: {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: session.customer as string,
          plan,
          status: "ACTIVE",
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const dbSub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: sub.id },
      });
      if (!dbSub) break;

      // Determine plan from price ID
      const priceId = sub.items.data[0]?.price?.id;
      let plan = dbSub.plan;
      if (priceId === process.env.STRIPE_BASIC_PRICE_ID) plan = "BASIC";
      else if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = "PRO";

      const statusMap: Record<string, string> = {
        active: "ACTIVE",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        unpaid: "PAST_DUE",
      };

      const itemPeriodEnd = sub.items.data[0]?.current_period_end;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: sub.id },
        data: {
          plan,
          status: statusMap[sub.status] || "ACTIVE",
          currentPeriodEnd: itemPeriodEnd ? new Date(itemPeriodEnd * 1000) : undefined,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELED" },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subRef = invoice.parent?.subscription_details?.subscription;
      const subId = typeof subRef === "string" ? subRef : subRef?.id;
      if (subId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subId },
          data: { status: "PAST_DUE" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
