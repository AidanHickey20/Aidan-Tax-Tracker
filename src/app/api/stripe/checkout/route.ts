import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { getStripe } from "@/lib/stripe";
import { getAnnualPricing } from "@/lib/seasonal-promo";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const { plan, billing } = await request.json();

  if (plan !== "BASIC" && plan !== "PRO") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const stripe = getStripe();

  // Get or create subscription record
  let sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: { userId, plan: "TRIAL", status: "EXPIRED" },
    });
  }

  // Get or create Stripe customer
  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const customer = await stripe.customers.create({
      email: user?.email || undefined,
      name: user?.name || undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "";

  if (billing === "annual") {
    // One-time payment for 12 months at 15% off
    const { basicAnnual, proAnnual } = getAnnualPricing();
    const amount = plan === "PRO" ? proAnnual : basicAnnual;
    const amountCents = Math.round(amount * 100);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `REtaxly ${plan === "PRO" ? "Pro" : "Basic"} — Annual Plan`,
            description: `12 months of ${plan === "PRO" ? "Pro" : "Basic"} access (15% off)`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      metadata: { userId, plan, billing: "annual" },
    });

    return NextResponse.json({ url: session.url });
  }

  // Monthly subscription
  const priceId = plan === "PRO"
    ? process.env.STRIPE_PRO_PRICE_ID!
    : process.env.STRIPE_BASIC_PRICE_ID!;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/billing?success=true`,
    cancel_url: `${origin}/billing?canceled=true`,
    metadata: { userId, plan },
  });

  return NextResponse.json({ url: session.url });
}
