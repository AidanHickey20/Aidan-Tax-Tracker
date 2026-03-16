import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/get-user";
import { validate, updateSettingsSchema } from "@/lib/validations";

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
  const parsed = validate(updateSettingsSchema, body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: {
      incomeGoal: parsed.data.incomeGoal ?? 0,
      bankBalance: parsed.data.bankBalance ?? 0,
      homeValue: parsed.data.homeValue ?? 0,
      homeAppreciation: parsed.data.homeAppreciation ?? 0,
      mortgageBalance: parsed.data.mortgageBalance ?? 0,
      mortgageRate: parsed.data.mortgageRate ?? 0,
      mortgagePayment: parsed.data.mortgagePayment ?? 0,
      studentLoanBalance: parsed.data.studentLoanBalance ?? 0,
      studentLoanRate: parsed.data.studentLoanRate ?? 0,
      studentLoanPayment: parsed.data.studentLoanPayment ?? 0,
      carLoanBalance: parsed.data.carLoanBalance ?? 0,
      carLoanRate: parsed.data.carLoanRate ?? 0,
      carLoanPayment: parsed.data.carLoanPayment ?? 0,
      refDate: parsed.data.refDate ? new Date(parsed.data.refDate) : new Date(),
      studentLoanPaymentDay: parsed.data.studentLoanPaymentDay ?? 1,
      carLoanPaymentDay: parsed.data.carLoanPaymentDay ?? 16,
      investmentGrowthRate: parsed.data.investmentGrowthRate ?? 0.07,
    },
    create: {
      userId,
      incomeGoal: parsed.data.incomeGoal ?? 0,
      bankBalance: parsed.data.bankBalance ?? 0,
      homeValue: parsed.data.homeValue ?? 0,
      homeAppreciation: parsed.data.homeAppreciation ?? 0,
      mortgageBalance: parsed.data.mortgageBalance ?? 0,
      mortgageRate: parsed.data.mortgageRate ?? 0,
      mortgagePayment: parsed.data.mortgagePayment ?? 0,
      studentLoanBalance: parsed.data.studentLoanBalance ?? 0,
      studentLoanRate: parsed.data.studentLoanRate ?? 0,
      studentLoanPayment: parsed.data.studentLoanPayment ?? 0,
      carLoanBalance: parsed.data.carLoanBalance ?? 0,
      carLoanRate: parsed.data.carLoanRate ?? 0,
      carLoanPayment: parsed.data.carLoanPayment ?? 0,
      refDate: parsed.data.refDate ? new Date(parsed.data.refDate) : new Date(),
      studentLoanPaymentDay: parsed.data.studentLoanPaymentDay ?? 1,
      carLoanPaymentDay: parsed.data.carLoanPaymentDay ?? 16,
      investmentGrowthRate: parsed.data.investmentGrowthRate ?? 0.07,
    },
  });

  return NextResponse.json(settings);
}
