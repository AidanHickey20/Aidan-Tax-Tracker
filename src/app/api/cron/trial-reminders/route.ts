import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTrialEndingEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find active trials ending in 3 days or 1 day
  const trials = await prisma.subscription.findMany({
    where: {
      plan: "TRIAL",
      status: "ACTIVE",
      trialEndsAt: { not: null },
    },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  let sent = 0;
  for (const sub of trials) {
    if (!sub.trialEndsAt || !sub.user.email) continue;

    const daysLeft = Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Send reminders at 3 days and 1 day before expiration, and on expiration day
    if (daysLeft === 3 || daysLeft === 1 || daysLeft === 0) {
      try {
        await sendTrialEndingEmail(sub.user.email, sub.user.name || "", daysLeft);
        sent++;
      } catch (error) {
        console.error(`Failed to send trial reminder to ${sub.user.email}:`, error);
      }
    }
  }

  return NextResponse.json({ checked: trials.length, sent });
}
