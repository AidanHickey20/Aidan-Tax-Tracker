import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { secret } = await request.json();
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Give existing users without a subscription the PRO plan
  const usersWithoutSub = await prisma.user.findMany({
    where: { subscription: null },
    select: { id: true },
  });

  let created = 0;
  for (const u of usersWithoutSub) {
    await prisma.subscription.create({
      data: { userId: u.id, plan: "PRO", status: "ACTIVE" },
    });
    created++;
  }

  return NextResponse.json({ migrated: created });
}
