import { prisma } from "@/lib/prisma";

export type Plan = "TRIAL" | "BASIC" | "PRO" | "EXPIRED";

export async function getUserSubscription(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return null;

  // Auto-expire trials
  if (sub.plan === "TRIAL" && sub.status === "ACTIVE" && sub.trialEndsAt) {
    if (new Date() > sub.trialEndsAt) {
      return prisma.subscription.update({
        where: { userId },
        data: { status: "EXPIRED" },
      });
    }
  }

  return sub;
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const sub = await getUserSubscription(userId);
  if (!sub) return "EXPIRED";
  if (sub.status === "EXPIRED" || sub.status === "CANCELED") return "EXPIRED";
  return sub.plan as Plan;
}

export async function isProUser(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);
  return plan === "PRO" || plan === "TRIAL";
}
