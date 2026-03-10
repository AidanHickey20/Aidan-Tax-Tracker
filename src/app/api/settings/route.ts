import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";

export async function GET() {
  const userId = await requireUserId();

  let settings = await prisma.userSettings.findUnique({ where: { userId } });

  // Auto-create default settings for new users
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId, refDate: new Date() },
    });
  }

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  const body = await request.json();

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      incomeGoal: body.incomeGoal ?? 0,
      bankBalance: body.bankBalance ?? 0,
      homeValue: body.homeValue ?? 0,
      homeAppreciation: body.homeAppreciation ?? 0,
      mortgageBalance: body.mortgageBalance ?? 0,
      mortgageRate: body.mortgageRate ?? 0,
      mortgagePayment: body.mortgagePayment ?? 0,
      studentLoanBalance: body.studentLoanBalance ?? 0,
      studentLoanRate: body.studentLoanRate ?? 0,
      studentLoanPayment: body.studentLoanPayment ?? 0,
      carLoanBalance: body.carLoanBalance ?? 0,
      carLoanRate: body.carLoanRate ?? 0,
      carLoanPayment: body.carLoanPayment ?? 0,
      refDate: body.refDate ? new Date(body.refDate) : new Date(),
    },
    create: {
      userId,
      incomeGoal: body.incomeGoal ?? 0,
      bankBalance: body.bankBalance ?? 0,
      homeValue: body.homeValue ?? 0,
      homeAppreciation: body.homeAppreciation ?? 0,
      mortgageBalance: body.mortgageBalance ?? 0,
      mortgageRate: body.mortgageRate ?? 0,
      mortgagePayment: body.mortgagePayment ?? 0,
      studentLoanBalance: body.studentLoanBalance ?? 0,
      studentLoanRate: body.studentLoanRate ?? 0,
      studentLoanPayment: body.studentLoanPayment ?? 0,
      carLoanBalance: body.carLoanBalance ?? 0,
      carLoanRate: body.carLoanRate ?? 0,
      carLoanPayment: body.carLoanPayment ?? 0,
      refDate: body.refDate ? new Date(body.refDate) : new Date(),
    },
  });

  return NextResponse.json(settings);
}
