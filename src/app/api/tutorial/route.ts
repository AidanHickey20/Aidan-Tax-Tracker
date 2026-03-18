import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function GET() {
  const userId = await requireUserId();
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  return NextResponse.json({ hasSeenTutorial: settings?.hasSeenTutorial ?? false });
}

export async function POST() {
  const userId = await requireUserId();
  await prisma.userSettings.upsert({
    where: { userId },
    update: { hasSeenTutorial: true },
    create: { userId, hasSeenTutorial: true },
  });
  return NextResponse.json({ success: true });
}
