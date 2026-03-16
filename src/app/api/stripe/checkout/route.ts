import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  const { plan } = await request.json();

  if (plan !== "BASIC" && plan !== "PRO") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = plan === "PRO"
    ? process.env.STRIPE_PRO_PRICE_ID!
    : process.env.STRIPE_BASIC_PRICE_ID!;

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
